// Processor Model (OpenPay, Conekta, etc.)
import { Document, Schema, Model, model} from "mongoose";

export interface IProcessor {
    name : String,
    commission : {
        business : Number;
        isPercentage : Boolean;
        omni : Number;
    },
    daysForPayment : Number
}

export interface IProcessorModel extends IProcessor, Document {
}
export const ProcessorSchema: Schema = new Schema({

    name : String,
    commision : {
        processor : Number,
        isPercentage : {type: Boolean, default : false},
        omni: Number
    },
    daysForPayment : {type: Number, default : 10}
    },
    {
    timestamps: false
    }
);

export const Processor : Model<IProcessorModel> = model<IProcessorModel>("Processor", ProcessorSchema);
