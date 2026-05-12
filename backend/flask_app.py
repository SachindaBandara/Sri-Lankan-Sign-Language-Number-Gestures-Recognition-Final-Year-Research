from flask import Flask, jsonify
from flask_cors import CORS

from routes.activity_routes import activity_bp
from routes.prediction_routes import prediction_bp


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)

    app.register_blueprint(prediction_bp)
    app.register_blueprint(activity_bp)

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"})

    return app
