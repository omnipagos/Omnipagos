// Processor Model (OpenPay, Conekta, etc.)
import { Document, Schema, Model, model} from "mongoose";

export interface IErrorReport {
  description : String,
  user : String,
  errorLog : Array<String>
}

export interface IErrorReportModel extends IErrorReport, Document {
}
export const ErrorReportSchema: Schema = new Schema({

    description : String,
    errorLog : { type : [String], default : []},
    user : {type : Schema.Types.ObjectId, ref : 'User'}

  },
  {
    timestamps: true
  }
);

export const ErrorReport : Model<IErrorReportModel> = model<IErrorReportModel>("ErrorReport", ErrorReportSchema);
