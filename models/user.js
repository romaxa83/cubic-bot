const {Schema, model} = require('mongoose');

// схема для таблици
const userSchema = new Schema({
    email: {
        type: String,
        required: true
    },
    name: String,
    password: {
        type: String,
        required: true
    },
    avatarUrl: String,
    resetToken: String,
    resetTokenExp: Date,
});

module.exports = model('User', userSchema);