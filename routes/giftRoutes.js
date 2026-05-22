const express = require("express");
const fs = require("fs");
const crypto = require("crypto");

const router = express.Router();

/* ========= ENSURE FOLDERS ========= */

const ensure = (p) => {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
};

ensure("data");
ensure("public/uploads/images");
ensure("public/uploads/songs");

/* ========= HELPER ========= */

const loadGift = (id) => {

  if (!fs.existsSync("data/gifts.json")) {
    return null;
  }

  const gifts = JSON.parse(
    fs.readFileSync("data/gifts.json", "utf-8")
  );

  return gifts[id] || null;
};

/* ========= CREATE BIRTHDAY WEBSITE ========= */

router.post("/create-gift", async (req, res) => {

  try {

    console.log("BODY:", req.body);
    console.log("FILES:", req.files);

    /* ========= CHECK FILE ========= */

    if (
      !req.files ||
      !req.files.didiImage
    ) {

      return res.json({
        success: false,
        message: "Birthday photo required"
      });

    }

    const filePath = "data/gifts.json";

    let gifts = {};

    if (fs.existsSync(filePath)) {

      gifts = JSON.parse(
        fs.readFileSync(filePath, "utf-8")
      );

    }

    /* ========= GENERATE ID ========= */

    const id = crypto
      .randomBytes(4)
      .toString("hex");

    /* ========= GET FILES ========= */

    const didiImage =
req.files.didiImage;

const jijaImage =
req.files.jijaImage;

const song =
req.files.song;

    /* ========= SAVE BIRTHDAY PHOTO ========= */

    const birthdayFile =
      Date.now() +
      "-" +
      didiImage.name.replace(/\s+/g, "-");

    await didiImage.mv(
      "public/uploads/images/" + birthdayFile
    );

    /* ========= SAVE YOUR PHOTO ========= */

    let yourPhotoFile = null;

    if (jijaImage) {

      yourPhotoFile =
        Date.now() +
        "-" +
       jijaImage.name.replace(/\s+/g, "-");

     await jijaImage.mv(
        "public/uploads/images/" + yourPhotoFile
      );

    }

    /* ========= SAVE SONG ========= */

    let songFile = null;

    if (song) {

      songFile =
        Date.now() +
        "-" +
        song.name.replace(/\s+/g, "-");

      await song.mv(
        "public/uploads/songs/" + songFile
      );

    }

    /* ========= SAVE DATA ========= */

    gifts[id] = {

      id,

      didiName:
req.body.didiName || "Birthday Person",

      message:
        req.body.message || "",

      didiImage:
"/uploads/images/" + birthdayFile,

      jijaImage:
        yourPhotoFile
          ? "/uploads/images/" + yourPhotoFile
          : "/uploads/images/" + birthdayFile,

      song:
        songFile
          ? "/uploads/songs/" + songFile
          : null,

      createdAt:
        new Date().toISOString()

    };

    fs.writeFileSync(
      filePath,
      JSON.stringify(gifts, null, 2)
    );

    /* ========= SUCCESS ========= */

    return res.json({

      success: true,

      url: `/view/${id}`

    });

  } catch (err) {

    console.log("Gift Error:", err);

    return res.json({

      success: false,

      message: err.message || "Upload failed"

    });

  }

});

/* ========= HOME ========= */

router.get("/view/:id", (req, res) => {

  const gift = loadGift(req.params.id);

  if (!gift) {
    return res.send("Gift not found");
  }

  gift.id = req.params.id;

  res.render(
    "Birthday_Celebration/index",
    {
      gift,
      page: "home"
    }
  );

});

/* ========= JOURNEY ========= */

router.get("/view/:id/journey", (req, res) => {

  const gift = loadGift(req.params.id);

  if (!gift) {
    return res.send("Gift not found");
  }

  gift.id = req.params.id;

  res.render(
    "Birthday_Celebration/journey",
    {
      gift,
      page: "journey"
    }
  );

});

/* ========= GIFT ========= */

router.get("/view/:id/gift", (req, res) => {

  const gift = loadGift(req.params.id);

  if (!gift) {
    return res.send("Gift not found");
  }

  gift.id = req.params.id;

  res.render(
    "Birthday_Celebration/gift",
    {
      gift,
      page: "gift"
    }
  );

});

/* ========= MEMORIES ========= */

router.get("/view/:id/memories", (req, res) => {

  const gift = loadGift(req.params.id);

  if (!gift) {
    return res.send("Gift not found");
  }

  gift.id = req.params.id;

  res.render(
    "Birthday_Celebration/memories",
    {
      gift,
      page: "memories"
    }
  );

});

/* ========= FEEDBACK ========= */

router.get("/view/:id/feedback", (req, res) => {

  const gift = loadGift(req.params.id);

  if (!gift) {
    return res.send("Gift not found");
  }

  gift.id = req.params.id;

  res.render(
    "Birthday_Celebration/feedback",
    {
      gift,
      page: "feedback"
    }
  );

});

module.exports = router;