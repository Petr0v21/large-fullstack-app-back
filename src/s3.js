// require("dotenv").config()
// import S3 from "aws-sdk/clients/s3"
import * as dotenv from "dotenv";
import S3 from "aws-sdk/clients/s3.js";
dotenv.config();

const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;
const region = process.env.AWS_BUCKET_REGION;
const bucketName = process.env.AWS_BUCKET_NAME;

const s3 = new S3({
  region,
  accessKeyId,
  secretAccessKey,
});

// uploads a file to s3
const uploadFile = (file) => {
  const fileStream = fs.createReadStream(file.path);

  const uploadParams = {
    Bucket: bucketName,
    Body: fileStream,
    Key: file.filename,
  };
  return s3.upload(uploadParams).promise();
};

// downloads a file from s3

const getFileStream = (fileKey) => {
  const downloadParams = {
    Key: fileKey,
    Bucket: bucketName,
  };
  return s3.getObject(downloadParams).createReadStream();
};

export { getFileStream, uploadFile };
