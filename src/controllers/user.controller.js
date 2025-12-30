import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/user.models.js";
import uploadToCloudinary from "../utils/cloudnary.js";
import ApiResponse from "../utils/Apiresponse.js";

const registerUser = asyncHandler(async (req, res) => {
	const { fullName, email, username, password } = req.body;
	if (
		[fullName, email, username, password].some((field) => field?.trim() === "")
	) {
		throw new ApiError(400, "All fields are required");
	}

	const existedUser = await User.findOne({
		$or: [{ Username: username }, { email }],
	});
	if (existedUser) {
		throw new ApiError(409, "User with email or username already exists");
	}

	const avatarLocalPath = req.files?.avatar[0]?.path;
	let coverImageLocalPath;
	if (
		req.files &&
		Array.isArray(req.files.coverImage) &&
		req.files.coverImage.length > 0
	) {
		coverImageLocalPath = req.files.coverImage[0].path;
	}

	if (!avatarLocalPath) {
		throw new ApiError(400, "Avatar image is required");
	}

	const avatar = await uploadToCloudinary(avatarLocalPath);
	if (!avatar) {
		throw new ApiError(400, "Avatar image upload failed");
	}

	let coverImage;
	if (coverImageLocalPath) {
		coverImage = await uploadToCloudinary(coverImageLocalPath);
	}

	const createdUser = await User.create({
		fullname: fullName,
		avatar: avatar.url,
		coverImage: coverImage?.url || "",
		email,
		password,
		Username: username.toLowerCase(),
	});

	const userWithoutPassword = await User.findById(createdUser._id).select(
		"-password -refereshToken"
	);

	if (!userWithoutPassword) {
		throw new ApiError(500, "Something went wrong while registering the user");
	}

	return res
		.status(201)
		.json(
			new ApiResponse(200, userWithoutPassword, "User registered successfully")
		);
});

export default registerUser;
