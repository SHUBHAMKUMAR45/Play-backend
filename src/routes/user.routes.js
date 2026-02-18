import { Router } from "express";
import {
	registerUser,
	loginUser,
	logoutUser,
	refreshAccessToken,
	changeCurrentPassword,
	getcurrentUser,
	getWatchHistory,
	updateAccountSettings,
	updateuserAvatar,
	updateuserCoverImage,
	getuserchannelProfile
} from "../controllers/user.controller.js";

import upload from "../middleware/upload.middleware.js";
import {verifyJWT} from "../middleware/auth.middleware.js";

const router = Router();

router.route("/register").post(
	upload.fields([
		{ name: "avatar", maxCount: 1 },
		{ name: "coverImage", maxCount: 3 },
	]),
	registerUser
);

router.route("/login").post(loginUser);

router.route("/logout").post(verifyJWT, logoutUser);

router.route("/refresh-token").post(refreshAccessToken);

router.route("/change-password").post(verifyJWT,changeCurrentPassword);

router.route("/current-user").get(verifyJWT, getcurrentUser);

router.route("/watch-history").get(verifyJWT, getWatchHistory);

router.route("/update-account-settings").patch(verifyJWT, updateAccountSettings);

router.route("/update-avatar").patch(verifyJWT,upload.single("avatar"),updateuserAvatar);

router.route("/update-cover-images").patch(verifyJWT,upload.single("coverImage"),updateuserCoverImage);

router.route("/c/:username").get(verifyJWT,getuserchannelProfile);

router.route("/history").get(verifyJWT, getWatchHistory);



export default router;
