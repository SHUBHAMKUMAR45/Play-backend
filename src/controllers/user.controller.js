import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/user.models.js";
import uploadToCloudinary from "../utils/cloudnary.js";
import ApiResponse from "../utils/Apiresponse.js";
import jwt from "jsonwebtoken";


const generateAccessTokenAndRefreshToken = async(userId) =>{
	try{
		const user = await User.findById(userId);
		const accessToken = user.generateAccessToken();
		const refreshToken = user.generateRefreshToken();

		user.refreshToken = refreshToken;
		await user.save({ validateBeforeSave: false });

		return { accessToken, refreshToken };
	}catch(error){
		throw new ApiError(500, "Failed to generate access and refresh token");
	}
}

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

const loginUser = asyncHandler(async (req, res) => {
   
	const { email ,username, password } = req.body;
	if (!email && !username) {
		throw new ApiError(400, "Email or username is required");
	}

	const user = await User.findOne({
		$or: [{ email }, { username }],
	});

	if (!user) {
		throw new ApiError(404, "User does not exist");
	}

	const isPasswordValid = await user.isPasswordCorrect(password);

	if (!isPasswordValid) {
		throw new ApiError(401, "Invalid user credentials");
	}

	const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id);

	// res.status(200)
	// 	.json(
	// 		new ApiResponse(
	// 			200,
	// 			{
	// 				user,
	// 				accessToken,
	// 				refreshToken,
	// 			},
	// 			"User logged in successfully"
	// 		)
	// 	);

	const loggedInUser = await User.findById(user._id).select(
		"-password -refereshToken"
	);
	const options ={
		httpOnly: true,
		secure:true
	}
	
	return res
	.status(200)
	.cookie("refreshToken", refreshToken, options)
	.cookie("accessToken", accessToken, options)
	.json(
		new ApiResponse(
			200,
			{
				user: loggedInUser,accessToken,refreshToken
			},
			"User logged in successfully")
	);
});


const logoutUser = asyncHandler(async (req, res) => {
	// Implement logout functionality here
	await User.findByIdAndUpdate(req.user._id, 
		{ $set: { refreshToken: undefined } }
		, { new: true }
	)

	const options = {
		httpOnly: true,
		secure: true
	}

	 return res.status(200)
	.clearCookie("refreshToken", options)
	.clearCookie("accessToken", options)
	.json(new ApiResponse(200, {}, "User logged out successfully"));
})


const refreshAccessToken = asyncHandler(async (req, res) => {
	const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

	if (!incomingRefreshToken) {
		throw new ApiError(401, "Unauthorized request");
	}

	try {
		const decodedToken = jwt.verify(
			incomingRefreshToken,
			process.env.REFRESH_TOKEN_SECRET
		);

		const user = await User.findById(decodedToken?._id);

		if (!user) {
			throw new ApiError(401, "Invalid refresh token");
		}

		if (incomingRefreshToken !== user?.refreshToken) {
			throw new ApiError(401, "Refresh token is expired or used");
		}

		const { accessToken, newRefreshToken } = await generateAccessTokenAndRefreshToken(user._id);

		const options = {
			httpOnly: true,
			secure: true,
		};

		return res
			.status(200)
			.cookie("accessToken", accessToken, options)
			.cookie("refreshToken", newRefreshToken, options)
			.json(
				new ApiResponse(
					200,
					{
						user,
						accessToken,
						refreshToken:newRefreshToken
					},
					"Access token refreshed successfully"
				)
			);
			
	} catch (error) {
		throw new ApiError(401, error?.message || "Invalid refresh token");	
	}
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
	const { currentPassword, newPassword } = req.body;
	if (!currentPassword || !newPassword) {
		throw new ApiError(400, "All fields are required");
	}

	const user = await User.findById(req.user?._id);
	const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);

	if (!isPasswordCorrect) {
		throw new ApiError(400, "Invalid current password");
	}

	user.password = newPassword;
	await user.save({ validateBeforeSave: false });

	return res
		.status(200)
		.json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getcurrentUser = asyncHandler(async (req, res) => {
	const user = await User.findById(req.user?._id).select("-password -refereshToken");
	if (!user) {
		throw new ApiError(404, "User not found");
	}

	return res
		.status(200)
		.json(new ApiResponse(200, user, "Current user fetched successfully"));
});


const updateAccountSettings = asyncHandler(async (req, res) => {
	// Implement account settings

	const { fullName, email, username } = req.body;
	if (!fullName || !email || !username) {
		throw new ApiError(400, "All fields are required");
	}

	const user = await User.findByIdAndUpdate(
		req.user?._id,
		{
			$set: {
				fullName,
				email,
				username
			}
		},
		{ new: true }
	).select("-password -refereshToken");

	return res
	.status(200)
	.json(new ApiResponse(200, user, "Account settings updated successfully"));
});


const updateuserAvatar = asyncHandler(async (req, res) => {
	const avatarLocalPath = req.files?.avatar[0]?.path;

	if (!avatarLocalPath) {
		throw new ApiError(400, "Avatar image is required");
	}

	//delete old avtar img from cloudinary
	const user = await User.findById(req.user?._id);
	if (user?.avatar) {
		const publicId = user.avatar.split("/").pop().split(".")[0];
		await uploadToCloudinary.delete(publicId);
	}
	
	
	const avatar = await uploadToCloudinary(avatarLocalPath);
	if (!avatar.url) {
		throw new ApiError(400, "Error while uploading avatar");
	}
	const updatedUser = await User.findByIdAndUpdate(
		req.user?._id,
		{
			$set: {
				avatar: avatar.url
			}
		},
		{ new: true }
	).select("-password -refereshToken");

	return res
	.status(200)
	.json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateuserCoverImage = asyncHandler(async (req, res) => {
	const coverImageLocalPath = req.file?.coverImage[0]?.path;
	if (!coverImageLocalPath) {
		throw new ApiError(400, "Cover image is required");
	}
	const coverImage = await uploadToCloudinary(coverImageLocalPath);
	if (!coverImage.url) {
		throw new ApiError(400, "Error while uploading cover image");
	}
	const user = await User.findByIdAndUpdate(
		req.user?._id,
		{
			$set: {
				coverImage: coverImage.url
			}
		},
		{ new: true }
	).select("-password -refereshToken");

	return res
	.status(200)
	.json(new ApiResponse(200, user, "Cover image updated successfully"));
});


const getuserchannelProfile = asyncHandler(async (req, res) => {
	const { username } = req.params;
	if (!username?.trim()) {
		throw new ApiError(400, "Username is required");
	}

	const channel = await User.aggregate([
		{
			$match: {
				username: username?.toLowerCase()
			}
		},
		{
			$lookup: {
				from: "subscriptions",
				localField: "_id",
				foreignField: "channel",
				as: "subscribers"
			}
		},
		{
			$lookup: {
				from: "subscriptions",
				localField: "_id",
				foreignField: "subscriber",
				as: "subscribedTo"
			}
		},
		{
			$addFields: {
				subscribersCount: { $size: "$subscribers" },
				channelsSubscribedToCount: { $size: "$subscribedTo" },
				isSubscribed: {
					$cond: {
						if: { $in: [req.user?._id, "$subscribers.subscriber"] },
						then: true,
						else: false
					}
				}
			}
		},
		{
			$project: {
				fullName: 1,
				username: 1,
				avatar: 1,
				subscribersCount: 1,
				channelsSubscribedToCount: 1,
				isSubscribed: 1,
				coverImage: 1,
				email: 1

		}
		}	
	])
    if (!channel || channel.length === 0) {
		throw new ApiError(404, "Channel not found");
	}



	return res
		.status(200)
		.json(new ApiResponse(200, channel[0], "User channel profile fetched successfully"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
	// Implement watch history functionality here
     const user=await User.aggregate([
		{
			$match:{
				_id:new mongoose.Types.ObjectId(req.user._id)
		}
	},
	{
		$lookup: {
			from: "videos",
			localField: "watchHistory",
			foreignField: "_id",
			as: "watchHistoryDetails",
			pipeline:[
				{
					$lookup:{
						from:"users",
						localField:"owner",
						foreignField:"_id",
						as:"owner",
						pipeline:[
							{
								$project:{
									fullName:1,
									username:1,
									avatar:1
								}
							}
						]
						
					}

				},
				{
					$addFields:{
						owner:{
							$first:"$owner"
						}
					}
				}
			]
		}
	}
	 ])

    return res
		.status(200)
		.json(new ApiResponse(200, user[0]?.watchHistoryDetails || [], "User watch history fetched successfully"));


})

export  { registerUser, loginUser , logoutUser , refreshAccessToken,changeCurrentPassword, getcurrentUser, updateAccountSettings, updateuserAvatar, updateuserCoverImage, getuserchannelProfile,getWatchHistory }