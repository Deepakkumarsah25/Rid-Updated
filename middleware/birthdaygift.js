const fileUpload = require("express-fileupload");

const birthdaygift = fileUpload({

    useTempFiles: false,

    createParentPath: true,

    limits: {
        fileSize: 50 * 1024 * 1024
    },

    abortOnLimit: true,

    responseOnLimit: "File size too large"

});

module.exports = birthdaygift;