const multer = require("multer");

const storage =
    multer.memoryStorage();

const upload = multer({

    storage: storage,

    limits: {

        fileSize:
            20 * 1024 * 1024

    },

    fileFilter: (
        req,
        file,
        cb
    ) => {

        // ✅ IMAGE + AUDIO
        if (

            file.mimetype.startsWith(
                "image/"
            ) ||

            file.mimetype.startsWith(
                "audio/"
            )

        ) {

            cb(
                null,
                true
            );

        }

        else {

            cb(

                new Error(

                    "Only image/audio files allowed"

                ),

                false

            );

        }

    }

});

module.exports = upload;