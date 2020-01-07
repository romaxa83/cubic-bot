const {Schema, model} = require('mongoose');

// схема для таблици
const titleSchema = new Schema({
    date: {
        type: String,
        required: true
    },

    titles: {
        items: [{
            title: {
                type: String,
            },
            url: {
                type: String,
            },
            poster: {
                type: String
            },
            timePrice: [{
                priceLow: {
                    type: String,
                },
                priceHigh: {
                    type: String,
                },
                time: {
                    type: String
                }
            }]
        }]
    }
});

titleSchema.methods.addTitle = function(title, url) {
    const cloneItems =  [...this.titles.items];
    cloneItems.push({
        title: title,
        url: url
    });
    this.titles = {items: cloneItems};

    return this.save();
};

module.exports = model('Title', titleSchema);