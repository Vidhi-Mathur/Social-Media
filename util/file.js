// const path = require('path')
// const fs = require('fs')

// //Deletes an image. We use it when updating to remove the old image before adding the new one.
// exports.clearImage = filePath => {
//     //.. = controller -> root folder -> images
//     filePath = path.join(__dirname, '..', filePath);
//     fs.unlink(filePath, err => console.log(err));
//   };

// exports.clearImage = clearImage

const path = require('path');
const fs = require('fs');

const clearImage = filePath => {
  filePath = path.join(__dirname, '..', filePath);
  fs.unlink(filePath, err => console.log(err));
};

exports.clearImage = clearImage;