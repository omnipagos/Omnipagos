import {confirmEmail, orderConfirmation, orderPayed} from "./templates";

const nodemailer = require('nodemailer');

const gmailAuth = {
  email : process.env.GMAIL_ADDRESS,
  pwd : process.env.GMAIL_PWD
}

var helper = require('sendgrid').mail;


function generateVerificationUrl(email, _id) {
  return `https://omnipagos-alpha.herokuapp.com/api/user/verify/${email}/${_id}`;
}

export function sendEmail(_id : string, email : string, name : string){


  return new Promise((resolve,reject)=>{

    var from_email = new helper.Email('romateamalpha@gmail.com');
    var to_email = new helper.Email(email);
    var subject = 'Confirma tu dirección de correo';
    let emailHtml = confirmEmail(name, generateVerificationUrl(email, _id));
    var content = new helper.Content('text/html', emailHtml);
    var mail = new helper.Mail(from_email, subject, to_email, content);

    var sg = require('sendgrid')(process.env.SENDGRID_API_KEY);
    var request = sg.emptyRequest({
      method: 'POST',
      path: '/v3/mail/send',
      body: mail.toJSON(),
    });

    sg.API(request, (error, response) => {
      if(error) {
        console.log(error);
        reject(false);
      }
      resolve(true);
    });
});


}





export function sendTransactionEmail(email : string, formattedOrder : any) {
  return new Promise((resolve, reject) => {

    var from_email = new helper.Email('romateamalpha@gmail.com');
    var to_email = new helper.Email(email);
    var subject = 'Su transacción en Omnipagos';
    let emailHtml = orderConfirmation(formattedOrder);
    var content = new helper.Content('text/html', emailHtml);
    var mail = new helper.Mail(from_email, subject, to_email, content);

    var sg = require('sendgrid')(process.env.SENDGRID_API_KEY);
    var request = sg.emptyRequest({
      method: 'POST',
      path: '/v3/mail/send',
      body: mail.toJSON(),
    });

    sg.API(request, (error, response) => {
      if (error) {
        console.log(error);
        reject(false);
      }
      resolve(true);
    });
  });
}
  export function sendTransactionProcessedEmail(email : string, formattedOrder : any) {
    return new Promise((resolve, reject) => {

      var from_email = new helper.Email('romateamalpha@gmail.com');
      var to_email = new helper.Email(email);
      var subject = 'Su transacción en Omnipagos ha sido procesada';
      let emailHtml = orderPayed(formattedOrder);
      var content = new helper.Content('text/html', emailHtml);
      var mail = new helper.Mail(from_email, subject, to_email, content);

      var sg = require('sendgrid')(process.env.SENDGRID_API_KEY);
      var request = sg.emptyRequest({
        method: 'POST',
        path: '/v3/mail/send',
        body: mail.toJSON(),
      });

      sg.API(request, (error, response) => {
        if (error) {
          console.log(error);
          reject(false);
        }
        resolve(true);
      });
    });
  }
