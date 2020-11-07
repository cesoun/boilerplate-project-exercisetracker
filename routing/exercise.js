const express = require('express');
const router = express.Router();

const User = require('../models/user');
const Exercise = require('../models/exercise');

const _ = require('lodash');

router.post('/new-user', async (req, res, next) => {
	const username = req.body.username;

	// check username is supplied.
	if (!username)
		return res.status(404).json({error: 'empty username'});

	await User.create({username: username}, (err, user) => {
		if (err)
			return res.status(404).json(err);

		// lodash omit the version. I know there is a way to pass in Schema.find({}, '-__v', cb);
		return res.json(_.omit(user.toObject(), ['__v']));
	});
});

// This block is honestly pretty wet and gross. It's just to early in the morning for me to mind atm.
router.post('/add', async (req, res) => {
	const {userId, description, duration, date} = req.body;

	// Check inputs.
	if (!userId || !description || !duration)
		return res.status(404).json({error: 'Missing required field(s)'});

	// Ensure number.
	if (duration && !parseInt(duration.trim()))
		return res.status(404).json({error: 'duration needs to be a number'});


	// setup the exercise document we plan to create.
	let exercise = {
		username: null,
		date: date ? new Date(date) : Date.now(),
		duration: parseInt(duration.trim()),
		description: description
	};


	// find the user by the supplied id.
	await User.findById(userId.trim(), '-__v', async (err, user) => {
		if (err)
			return res.status(404).json({error: err});


		if (!user)
			return res.status(404).json({error: `No user found for: ${userId}`});


		// update the object with the user.username.
		exercise.username = user.username;

		// Create the exercise.
		await Exercise.create(exercise, (err, doc) => {
			if (err)
				return res.status(404).json({error: err});

			// Document formatting
			doc = _.omit(doc.toObject(), ['__v']);
			doc.date = doc.date.toDateString();

			user = user.toObject();

			user.date = doc.date;
			user.duration = doc.duration;
			user.description = doc.description;

			// return the created exercise.
			return res.json(user);
		});
	});
});

router.get('/users', async (req, res) => {
	await User.find({}, (err, users) => {
		if (err)
			return res.status(404).json({error: 'failed to get all documents'});

		return res.json(users);
	});
});

router.get('/log', async (req, res) => {
	const {userId, from, to, limit} = req.query;

	// check that we got supplied a userId
	if (!userId)
		return res.send({status: 404, message: 'userId is REQUIRED'});

	// check if that user it in the database.
	await User.findById(userId, '-__v', async (err, user) => {
		if (err)
			return res.status(404).json({error: err});

		if (!user)
			return res.status(404).json({error: `Could not find user: ${userId}`});

		// Setup the selector object.
		let selector = {
			username: user.username
		};

		if (from || to)
			selector.date = {};

		// if we have a from date, add it to the $gte query.
		if (from)
			selector.date.$gte = Date.parse(from);

		// if we have a to date, add it to the $lte query.
		if (to)
			selector.date.$lte = Date.parse(to);

		// get all the exercises for this user.
		await Exercise.find(selector, '-_id -username -__v', (err, docs) => {
			if (err)
				return res.status(404).json({error: err});

			user = user.toObject();

			user.count = docs.length;
			user.log = docs.map(doc => {
				doc = doc.toObject();
				doc.date = doc.date.toDateString();
				return doc;
			});

			return res.json(user);
		})
			// apply the limit.
			.limit(parseInt(limit));
	});
});

module.exports = router;