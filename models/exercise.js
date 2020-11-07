const mongoose = require('mongoose');
const {Schema} = mongoose;

const ExerciseSchema = new Schema({
	username: String,
	date: Date,
	duration: Number,
	description: String
});

module.exports = mongoose.model('Exercise', ExerciseSchema);