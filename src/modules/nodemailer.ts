import nodemailer from "nodemailer";
//ZkO3BCP8KBIgJ4Pw
//dgnendtuafspetfb - petr0v21vs
//rjyfanutytjiwfdk - bilwork.info
const transporter = nodemailer.createTransport(
  {
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: "bilwork.info@gmail.com",
      pass: "rjyfanutytjiwfdk",
    },
  },
  {
    from: "Mailer test <bilwork.info@gmail.com>",
  }
);

const sendMail = async (mail: string, code: string) => {
  transporter.sendMail(
    {
      to: `${mail}`,
      subject: "Check mail",
      html: `<h2>${code}</h2>`,
    },
    (err: any, info: any) => {
      if (err) return console.log(err);
      console.log("Email sent: ", info);
    }
  );
};
export default sendMail;
