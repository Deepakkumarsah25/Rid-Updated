const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const TeacherTest = require("../../models/teacherTestModel");
const User = require("../../models/user");
const Teacher = require("../../models/Teacher");
const upload = require("../../middlewares/upload");
const cloudinary =
  require("../../config/cloudinary");

const streamifier =
  require("streamifier");
// 🔥 TEMP STORE (user wise questions)
let tempQuestionsStore = {};


function uploadToCloudinary(fileBuffer) {

  return new Promise((resolve, reject) => {

    const stream =
      cloudinary.uploader.upload_stream(

        {
          folder: "RID-Bharat-Thumbnails"
        },

        (error, result) => {

          if (error) {

            reject(error);

          } else {

            resolve(result);

          }

        }

      );

    streamifier
      .createReadStream(fileBuffer)
      .pipe(stream);

  });

}
// ================= SAVE TEMP QUESTIONS =================
router.post("/save-temp-questions", (req, res) => {
  try {
    const token = req.cookies.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    tempQuestionsStore[decoded.userId] = req.body.questions || [];

    console.log("Saved Temp Questions:", tempQuestionsStore[decoded.userId]);

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.json({ success: false });
  }
});


// ================= CREATE TEST =================
router.post(
  "/create-test",

  (req, res, next) => {

    if (
        req.headers["content-type"] &&
        req.headers["content-type"].includes("multipart/form-data")
    ) {

        upload.single("thumbnail")(req, res, function(err){

            if(err){

                console.log("MULTER ERROR:", err);

                return res.status(500).json({
                    success:false,
                    msg: err.message
                });

            }

            next();

        });

    }

    else {

        next();

    }

},

  async (req, res) => {

    try {

      console.log("BODY:", req.body);
      console.log("FILE:", req.file);

      const token = req.cookies.token;

      if (!token) {

        return res.status(401).json({
          success: false,
          msg: "Login required"
        });

      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      const rawQuestions =
        tempQuestionsStore[
          decoded.userId
        ] || [];

      if (!rawQuestions.length) {

        return res.json({
          success: false,
          msg: "No questions found"
        });

      }

      const formattedQuestions =
        rawQuestions.map((q) => {

          let options = [];

          if (
            q.type === "TF" ||
            q.type === "True/False"
          ) {

            options = [

              {
                text: "True",
                isCorrect:
                  q.correctAnswer === "True"
              },

              {
                text: "False",
                isCorrect:
                  q.correctAnswer === "False"
              }

            ];

          } else {

            options =
              (q.options || []).map(
                (opt) => ({

                  text:
                    typeof opt === "string"
                      ? opt
                      : opt.text,

                  isCorrect:
                    opt.isCorrect || false

                })
              );

          }

          return {

            text:
              q.q || q.text,

            type:
              q.type || "MCQ",

            points:
              q.marks || 1,

            options

          };

        });

      let thumbnailPath = "";

      if (req.file) {

        const result =
          await uploadToCloudinary(
            req.file.buffer
          );

        thumbnailPath =
          result.secure_url;

      }

      const newTest =
        new TeacherTest({

          createdBy:
            decoded.userId,

          creatorModel:
            decoded.role === "teacher"
              ? "Teacher"
              : "User",

          name:
            req.body.name,

          description:
            req.body.description,

          subject:
            req.body.subject || "General",

          duration:
            Number(req.body.duration) || 60,

          thumbnail:
            thumbnailPath,

          visibility:
            req.body.visibility || "private",

          questions:
            formattedQuestions,

          status:
            req.body.visibility === "public"
              ? "published"
              : "pending"

        });

      await newTest.save();

      delete tempQuestionsStore[
        decoded.userId
      ];

      console.log("✅ TEST CREATED");

      res.json({

        success: true,

        msg:
          "Test created successfully",

        test:
          newTest

      });

    }

    catch (err) {

      console.log(
        "❌ CREATE TEST ERROR:",
        err
      );

      res.status(500).json({

        success: false,

        msg:
          err.message ||
          "Server error"

      });

    }

  }
);


// ================= MY CHANNEL =================
router.get("/teacher/channel", async (req, res) => {
  try {
    const token = req.cookies.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const tests = await TeacherTest.find({
      $or: [
        { createdBy: decoded.userId },
        { teacher: decoded.userId } // old support
      ]
    }).sort({ createdAt: -1 });

    // console.log("User:", decoded.userId);
    // console.log("Channel Tests:", tests.length);

    res.render("NationalTestSeries/teacher/channel", { tests });

  } catch (err) {
    console.log(err);
    res.send("Error loading channel");
  }
});


// ================= PUBLIC TEST =================
router.get("/all-tests", async (req, res) => {
  try {
    const tests = await TeacherTest.find({
      visibility: "public"
    })
      .populate({
        path: "createdBy",
        select: "name"
      })
      .sort({ createdAt: -1 });

    res.render("NationalTestSeries/NationalTest", { tests });

  } catch (err) {
    console.log(err);
    res.send("Error loading tests");
  }
});


// ================= DELETE =================
router.delete("/delete/:id", async (req, res) => {
  try {
    // ❌ NO TOKEN → NOT LOGGED IN
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({
        success: false,
        msg: "Login required"
      });
    }

    // ✅ VERIFY TOKEN
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        msg: "Invalid token"
      });
    }

    // ✅ FIND TEST
    const test = await TeacherTest.findById(req.params.id);

    if (!test) {
      return res.status(404).json({
        success: false,
        msg: "Test not found"
      });
    }

    // 🔥 OWNER CHECK (IMPORTANT)
    if (test.createdBy.toString() !== decoded.userId) {
      return res.status(403).json({
        success: false,
        msg: "You can delete only your own test"
      });
    }

    // ✅ DELETE
    await TeacherTest.findByIdAndDelete(req.params.id);

    res.json({ success: true });

  } catch (err) {
    console.log("DELETE ERROR:", err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
});

// ================= MAKE TEST LIVE =================

router.post("/live/:id", async (req, res) => {

  try {

    const token = req.cookies.token;

    if (!token) {

      return res.status(401).json({
        success: false,
        msg: "Login required"
      });

    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const test = await TeacherTest.findById(
      req.params.id
    );

    if (!test) {

      return res.status(404).json({
        success: false,
        msg: "Test not found"
      });

    }

    // OWNER CHECK
    if (
      test.createdBy.toString()
      !== decoded.userId
    ) {

      return res.status(403).json({
        success: false,
        msg: "Unauthorized"
      });

    }

    test.status = "published";
    test.visibility = "public";

    await test.save();

    res.json({
      success: true
    });

  }

  catch (err) {

    console.log(err);

    res.status(500).json({
      success: false
    });

  }

});
// ================= TEST DETAILS PAGE =================
router.get("/test-details", (req, res) => {
  res.render("NationalTestSeries/test-details");
});

// ================= CREATE TEST PAGE =================
router.get("/cre", (req, res) => {
  res.render("NationalTestSeries/CreateTest/CreateTest.ejs");
});

module.exports = router;