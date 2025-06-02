from flask import Flask, jsonify
import requests
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # 모든 도메인에서 접근 허용

@app.route('/api/ticker')
def proxy_ticker():
    try:
        res = requests.get("https://api.bithumb.com/public/ticker/ALL_KRW")
        return jsonify(res.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
