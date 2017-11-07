// Transaction Model (any operation done via one of the business' processors)
import { Document, Schema, Model, model} from "mongoose";
import { IProcessor } from "server/db/models/processor";
import { IClient } from "server/db/models/client";
import { IBusiness } from "server/db/models/business";

export interface Status {
    description: string;
    updatedAt: Date;
    statusType : Number;
    creator : String;
}

export interface ITransaction extends Document {
    processor: number;
    description?: string;
    amount?: number;
    statusLog: Array<Status>;
    client: IClient;
    business: IBusiness;
    externalId : string;
    additionalData?: any;
    createdAt? : Date;
}

//export interface ITransactionModel extends ITransaction, Document {
//}
export const TransactionSchema: Schema = new Schema({

    processor : Number,
    externalId : String,
    additionalData: {externalId : String, reference: String, barcode_url: String},
    description : {type : String, required: false},
    amount : {type : Number, required : false},
    statusLog : [{
        description : String,
        updatedAt : Date,
        statusType : Number,
        creator : String,
        _id : false
    }],
    client : {type : Schema.Types.ObjectId, ref : 'Client'},
    business: {type : Schema.Types.ObjectId, ref : 'Business'},
    },
    {
    timestamps: true
    }
);

// TransactionSchema.pre('save', function(next){
//     var d = new Date();
//     d.setHours(d.getHours() - 5);
//     this.createdAt = d;
//     this.updatedAt = d;
//     this.statusLog[0].updatedAt = d;
//     next();
// });

// TransactionSchema.pre('update', function(next){
//     console.log(this);
//     var d = this.statusLog[this.statusLog.length - 1].updatedAt;
//     d.setHours(d.getHours() - 5);
//     this.statusLog[this.statusLog.length - 1].updatedAt = d;
//     next();
// });

export const Transaction : Model<ITransaction> = model<ITransaction>("Transaction", TransactionSchema);
