import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new mongoose.Schema({

    tittle:{
        type: String,
        required: [true, "Tittle is required"],
    },
    description:{
        type: String,
        required: [true, "Description is required"],
        trim: true,
    },
    videoFile:{
        type: String,
        required: [true, "Video file is required"],
    },
    thumbnail:{
        type: String,
        required: [true, "Thumbnail is required"],
    },
    onwer:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    views:{
        type: Number,
        default: 0,
    },
    duration:{
        type: Number,
    },
    isPublished:{
        type: Boolean,
        default: true,
    },

}, {timestamps: true});


videoSchema.plugin(mongooseAggregatePaginate);



export const Video = mongoose.model("Video", videoSchema);