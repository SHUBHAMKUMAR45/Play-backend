import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
	{
		Username: {
			type: String,
			required: [true, "Username is required"],
			trim: true,
			unique: true,
			lowercase: true,
			index: true,
		},
		email: {
			type: String,
			required: [true, "Email is required"],
			trim: true,
			unique: true,
			lowercase: true,
			index: true,
		},
		password: {
			type: String,
			required: [true, "Password is required"],
		},
		fullname: {
			type: String,
			required: [true, "Full name is required"],
			trim: true,
			index: true,
		},

		watchHistory: {
			type: [
				{
					type: mongoose.Schema.Types.ObjectId,
					ref: "Video",
				},
			],
		},
		avatar: {
			type: String,
			required: [true, "Avatar is required"],
		},
		coverImage: {
			type: String,
		},
		refereshToken: {
			type: String,
		},
	},
	{ timestamps: true }
);

userSchema.pre("save", function (next) {
	if (!this.isModified("password")) return next();
	this.password = bcrypt.hash(this.password, 10);
	next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
	return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
	return jwt.sign(
		{
			_id: this._id,
			email: this.email,
			Username: this.Username,
			fullname: this.fullname,
		},
		process.env.ACCESS_TOKEN_SECRET,
		{ expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
	);
};

userSchema.methods.generateRefreshToken = function () {
	return jwt.sign(
		{
			_id: this._id,
		},
		process.env.REFRESH_TOKEN_SECRET,
		{ expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
	);
};

export default mongoose.model("User", userSchema);
