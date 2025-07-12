const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const UserSchema = new Schema({
    email: {
        type :String,
        required: true,
    }
});

UserSchema.plugin(passportLocalMongoose); // it is used because it automatically implemant username, Hashing,salting for

module.exports = mongoose.model('User', UserSchema);