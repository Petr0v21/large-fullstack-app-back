import * as dotenv from "dotenv";
import S3 from "aws-sdk/clients/s3.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import fs from "fs";
dotenv.config();

const accessKeyId = process.env.LOCAL_AWS_ACCESS_KEY;
const secretAccessKey = process.env.LOCAL_AWS_SECRET_KEY;
const region = process.env.AWS_BUCKET_REGION;
const bucketName = process.env.AWS_BUCKET_NAME;

const s3 = new S3({
  region,
  accessKeyId,
  secretAccessKey,
});

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

function uploadFileS3(file: any, imageName: string) {
  const fileStream = fs.createReadStream(file.path);

  const uploadParams = {
    Bucket: bucketName,
    Body: fileStream,
    Key: imageName,
    ContentType: file.mimetype,
  };
  return s3Client.send(new PutObjectCommand(uploadParams));
}

export async function getObjectSignedUrl(key: string) {
  const params = {
    Bucket: bucketName,
    Key: key,
  };
  // https://aws.amazon.com/blogs/developer/generate-presigned-url-modular-aws-sdk-javascript/
  const command = new GetObjectCommand(params);
  const seconds = 900;
  const url = await getSignedUrl(s3Client, command, { expiresIn: seconds });
  return url;
}

export function deleteFile(fileName) {
  const deleteParams = {
    Bucket: bucketName,
    Key: fileName,
  };

  return s3Client.send(new DeleteObjectCommand(deleteParams));
}

// downloads a file from s3

const getFileStream = (fileKey: any) => {
  const downloadParams = {
    Key: fileKey,
    Bucket: bucketName,
  };
  return s3.getObject(downloadParams).createReadStream();
};

export { getFileStream, uploadFileS3 };
