#!/usr/bin/env python3
"""
Waitlist API Server
Handles waitlist form submissions and stores data in SQLite database
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Database configuration
DB_PATH = os.path.join(os.path.dirname(__file__), 'waitlist.db')

def init_db():
    """Initialize the database and create waitlist table if it doesn't exist"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS waitlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            product TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(email)
        )
    ''')
    
    conn.commit()
    conn.close()
    print(f"Database initialized at {DB_PATH}")

def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # This allows column access by name
    return conn

@app.route('/api/waitlist', methods=['POST'])
@app.route('/api/waitlist/', methods=['POST'])
def submit_waitlist():
    """Handle waitlist form submission"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        name = data.get('name', '').strip()
        email = data.get('email', '').strip().lower()
        product = data.get('product', 'all').strip()
        
        if not name:
            return jsonify({'error': 'Name is required'}), 400
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        # Basic email validation
        if '@' not in email or '.' not in email.split('@')[1]:
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Insert into database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO waitlist (name, email, product)
                VALUES (?, ?, ?)
            ''', (name, email, product))
            conn.commit()
            waitlist_id = cursor.lastrowid
            conn.close()
            
            return jsonify({
                'success': True,
                'message': 'Successfully added to waitlist',
                'id': waitlist_id
            }), 201
            
        except sqlite3.IntegrityError:
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Email already registered'
            }), 409
            
    except Exception as e:
        print(f"Error processing waitlist submission: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/waitlist', methods=['GET'])
@app.route('/api/waitlist/', methods=['GET'])
def get_waitlist():
    """Get all waitlist entries (for admin purposes)"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, name, email, product, created_at
            FROM waitlist
            ORDER BY created_at DESC
        ''')
        
        entries = []
        for row in cursor.fetchall():
            entries.append({
                'id': row['id'],
                'name': row['name'],
                'email': row['email'],
                'product': row['product'],
                'created_at': row['created_at']
            })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'count': len(entries),
            'entries': entries
        }), 200
        
    except Exception as e:
        print(f"Error fetching waitlist: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    # Initialize database
    init_db()
    
    # Run Flask app
    app.run(host='0.0.0.0', port=5000, debug=False)
