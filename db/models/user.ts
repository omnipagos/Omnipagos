//User Model (Users of a Business)

import { Document, Model, Schema, model } from "mongoose";
import { sign } from 'jsonwebtoken';
import { genSalt, hash } from "bcryptjs";
interface AuthAccess {
    id : string,
    access : string;
}

const JWT_HASH = process.env.JWT_HASH;

export interface IUser {
    isAdmin: Boolean;
    verified?: Boolean;
    lastOnline: [Date];
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    imgId: string;
    business: string;
}


export interface IUserModel extends IUser, Document {
  toJSON() : any;
  fullName() : string;
  generateToken() : any;
}

export const UserSchema: Schema = new Schema({

    isAdmin: {type : Boolean, default : false},
    verified: {type : Boolean, default : false, required : false},
    lastOnline: [Date],
    firstName: String,
    lastName: String,
    email: {type:String, unique:true},
    password: String,
    imgId: {type:String, default:'https://www.popvox.com/images/user-avatar-grey.png'},
    token : String,
    business: {type : Schema.Types.ObjectId, ref: 'Business'}
    },
    {
    timestamps: true
    }
);

UserSchema.pre("save", function(next) {
  let user = this;
  if(user.isModified('password')){
    genSalt(10, (err,salt)=>{
      hash(user.password, salt, (err,hash)=>{
        user.password = hash;
        next();
      });
    });
  }
  else{
    next();
  }
});

UserSchema.methods.toJSON = function() {
  var obj = this.toObject();
  obj.lastOnline = obj.lastOnline.reverse();
  delete obj.password;
  delete obj.token;
  return obj;
}

UserSchema.methods.fullName = function(): string {
  return (this.firstName.trim() + " " + this.lastName.trim());
};

UserSchema.methods.generateToken = function() {
  let user = this;
  const auth : AuthAccess = {
    id : this._id,
    access : 'auth'
  }
  let token = sign(auth, JWT_HASH);
  user.token = token;
  return user.save().then(()=>{
      return token;
  });
}

export const User: Model<IUserModel> = model<IUserModel>("User", UserSchema);
