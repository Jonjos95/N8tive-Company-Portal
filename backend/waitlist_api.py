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
import stripe

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Stripe configuration
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')

# Subscription plans (price IDs from Stripe)
PLANS = {
    'free': {
        'stripe_price_id': None,
        'name': 'Free',
        'price': 0,
        'currency': 'usd'
    },
    'pro': {
        'stripe_price_id': os.environ.get('STRIPE_PRO_PRICE_ID', ''),
        'name': 'Pro',
        'price': 9.99,
        'currency': 'usd'
    },
    'business': {
        'stripe_price_id': os.environ.get('STRIPE_BUSINESS_PRICE_ID', ''),
        'name': 'Business',
        'price': 29.99,
        'currency': 'usd'
    },
    'enterprise': {
        'stripe_price_id': os.environ.get('STRIPE_ENTERPRISE_PRICE_ID', ''),
        'name': 'Enterprise',
        'price': 99.99,
        'currency': 'usd'
    }
}

# Database configuration
DB_PATH = os.path.join(os.path.dirname(__file__), 'waitlist.db')

def init_db():
    """Initialize the database and create tables if they don't exist"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Waitlist table
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
    
    # Subscriptions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT NOT NULL,
            stripe_customer_id TEXT,
            stripe_subscription_id TEXT,
            stripe_price_id TEXT,
            plan_name TEXT NOT NULL,
            status TEXT NOT NULL,
            current_period_start TIMESTAMP,
            current_period_end TIMESTAMP,
            cancel_at_period_end INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

@app.route('/api/subscription/create-checkout-session', methods=['POST'])
def create_checkout_session():
    """Create a Stripe checkout session for subscription"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email', '').strip().lower()
        plan_name = data.get('plan', '').strip().lower()
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        if not plan_name or plan_name not in PLANS:
            return jsonify({'error': 'Invalid plan selected'}), 400
        
        plan = PLANS[plan_name]
        
        # Free plan doesn't need Stripe
        if plan_name == 'free':
            return jsonify({
                'success': True,
                'message': 'Free plan activated',
                'plan': plan_name
            }), 200
        
        if not plan['stripe_price_id']:
            return jsonify({'error': 'Plan not configured for payments'}), 400
        
        # Create or retrieve Stripe customer
        try:
            customers = stripe.Customer.list(email=email, limit=1)
            if customers.data:
                customer = customers.data[0]
            else:
                customer = stripe.Customer.create(email=email)
        except Exception as e:
            print(f"Error creating/retrieving customer: {str(e)}")
            return jsonify({'error': 'Failed to create customer'}), 500
        
        # Create checkout session
        try:
            origin = request.headers.get('Origin', request.headers.get('Referer', 'http://localhost:5000'))
            if origin.endswith('/'):
                origin = origin[:-1]
            
            checkout_session = stripe.checkout.Session.create(
                customer=customer.id,
                payment_method_types=['card'],
                line_items=[{
                    'price': plan['stripe_price_id'],
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=origin + '/?success=true&session_id={CHECKOUT_SESSION_ID}',
                cancel_url=origin + '/pricing.html?canceled=true',
                metadata={
                    'user_email': email,
                    'plan_name': plan_name
                }
            )
            
            return jsonify({
                'success': True,
                'sessionId': checkout_session.id,
                'url': checkout_session.url
            }), 200
            
        except Exception as e:
            print(f"Error creating checkout session: {str(e)}")
            return jsonify({'error': 'Failed to create checkout session'}), 500
            
    except Exception as e:
        print(f"Error processing checkout: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/subscription/webhook', methods=['POST'])
def stripe_webhook():
    """Handle Stripe webhook events"""
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')
    
    if not STRIPE_WEBHOOK_SECRET:
        return jsonify({'error': 'Webhook secret not configured'}), 500
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        print(f"Invalid payload: {str(e)}")
        return jsonify({'error': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError as e:
        print(f"Invalid signature: {str(e)}")
        return jsonify({'error': 'Invalid signature'}), 400
    
    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        handle_checkout_completed(session)
    elif event['type'] == 'customer.subscription.created':
        subscription = event['data']['object']
        handle_subscription_created(subscription)
    elif event['type'] == 'customer.subscription.updated':
        subscription = event['data']['object']
        handle_subscription_updated(subscription)
    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        handle_subscription_deleted(subscription)
    
    return jsonify({'success': True}), 200

def handle_checkout_completed(session):
    """Handle successful checkout"""
    try:
        customer_id = session.get('customer')
        subscription_id = session.get('subscription')
        email = session.get('metadata', {}).get('user_email')
        
        if subscription_id:
            subscription = stripe.Subscription.retrieve(subscription_id)
            save_subscription(email, customer_id, subscription)
    except Exception as e:
        print(f"Error handling checkout completed: {str(e)}")

def handle_subscription_created(subscription):
    """Handle subscription creation"""
    try:
        customer = stripe.Customer.retrieve(subscription.customer)
        email = customer.email
        save_subscription(email, subscription.customer, subscription)
    except Exception as e:
        print(f"Error handling subscription created: {str(e)}")

def handle_subscription_updated(subscription):
    """Handle subscription updates"""
    try:
        customer = stripe.Customer.retrieve(subscription.customer)
        email = customer.email
        save_subscription(email, subscription.customer, subscription)
    except Exception as e:
        print(f"Error handling subscription updated: {str(e)}")

def handle_subscription_deleted(subscription):
    """Handle subscription cancellation"""
    try:
        customer = stripe.Customer.retrieve(subscription.customer)
        email = customer.email
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE subscriptions
            SET status = 'canceled',
                updated_at = CURRENT_TIMESTAMP
            WHERE stripe_subscription_id = ?
        ''', (subscription.id,))
        
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error handling subscription deleted: {str(e)}")

def save_subscription(email, customer_id, subscription):
    """Save or update subscription in database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get plan name from price ID
        price_id = subscription['items']['data'][0]['price']['id']
        plan_name = 'pro'  # Default, should be determined from price_id
        
        for key, plan in PLANS.items():
            if plan.get('stripe_price_id') == price_id:
                plan_name = key
                break
        
        # Check if subscription exists
        cursor.execute('''
            SELECT id FROM subscriptions
            WHERE stripe_subscription_id = ?
        ''', (subscription.id,))
        
        existing = cursor.fetchone()
        
        if existing:
            # Update existing
            cursor.execute('''
                UPDATE subscriptions
                SET status = ?,
                    current_period_start = ?,
                    current_period_end = ?,
                    cancel_at_period_end = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE stripe_subscription_id = ?
            ''', (
                subscription.status,
                datetime.fromtimestamp(subscription.current_period_start).isoformat(),
                datetime.fromtimestamp(subscription.current_period_end).isoformat(),
                1 if subscription.cancel_at_period_end else 0,
                subscription.id
            ))
        else:
            # Insert new
            cursor.execute('''
                INSERT INTO subscriptions 
                (user_email, stripe_customer_id, stripe_subscription_id, stripe_price_id, plan_name, status, current_period_start, current_period_end)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                email,
                customer_id,
                subscription.id,
                price_id,
                plan_name,
                subscription.status,
                datetime.fromtimestamp(subscription.current_period_start).isoformat(),
                datetime.fromtimestamp(subscription.current_period_end).isoformat()
            ))
        
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error saving subscription: {str(e)}")

@app.route('/api/subscription/status', methods=['GET'])
def get_subscription_status():
    """Get subscription status for a user"""
    try:
        email = request.args.get('email', '').strip().lower()
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM subscriptions
            WHERE user_email = ?
            ORDER BY created_at DESC
            LIMIT 1
        ''', (email,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return jsonify({
                'success': True,
                'subscription': {
                    'plan': row['plan_name'],
                    'status': row['status'],
                    'current_period_end': row['current_period_end'],
                    'cancel_at_period_end': bool(row['cancel_at_period_end'])
                }
            }), 200
        else:
            return jsonify({
                'success': True,
                'subscription': {
                    'plan': 'free',
                    'status': 'none'
                }
            }), 200
            
    except Exception as e:
        print(f"Error fetching subscription status: {str(e)}")
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
