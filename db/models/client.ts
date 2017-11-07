// Client Model (Business' Customers)
import { Document, Schema, Model, model} from "mongoose";

export interface IClient {

    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    imgUrl? : string;
//    business: string;
}


export interface IClientModel extends IClient, Document {
  fullName(): string;
}
export const ClientSchema: Schema = new Schema({

    firstName: String,
    lastName: String,
    email: {type:String, unique:true, required:true},
    phoneNumber: String,
    imgUrl : {type:String, required:false, default:'https://pbs.twimg.com/profile_images/780820153713975298/BKt0wlzl.jpg'}
//    business: {type : Schema.Types.ObjectId, ref: 'Business'}
    },
    {
    timestamps: true
    }
);

ClientSchema.pre("save", function(next) {
  console.log(this);
  let onlyNumbers = /^\d+$/.test(this.phoneNumber);
  console.log(onlyNumbers);
  console.log(this.phoneNumber.length);
  if(onlyNumbers && this.phoneNumber.length === 10) next();
  else next(new Error("phone is not valid"));
});

ClientSchema.methods.fullName = function(): string {
  return (this.firstName.trim() + " " + this.lastName.trim());
};

export const Client: Model<IClientModel> = model<IClientModel>("Client", ClientSchema);
