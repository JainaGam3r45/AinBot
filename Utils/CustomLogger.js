const { ColorLogger } = require('colorful-logify');

class CustomLogger {
    constructor() {
        this.logger = new ColorLogger();
    }

    log(message) {
        this.logger.send(message);
    }
}

module.exports = CustomLogger;