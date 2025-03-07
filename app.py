from flask import Flask, render_template, request, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import sqlite3
import json
import pdfkit
from io import BytesIO
import calendar

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///budget.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Veritabanı Modelleri
class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(10), nullable=False) 
    category = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    date = db.Column(db.Date, nullable=False)
    description = db.Column(db.String(200))
    is_recurring = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    type = db.Column(db.String(10)) 

with app.app_context():
    db.create_all()
   
    default_categories = [
        ('Maaş', 'income'),
        ('Ek Gelir', 'income'),
        ('Kira', 'expense'),
        ('Market', 'expense'),
        ('Faturalar', 'expense'),
        ('Ulaşım', 'expense'),
        ('Eğlence', 'expense')
    ]
    for cat_name, cat_type in default_categories:
        if not Category.query.filter_by(name=cat_name).first():
            db.session.add(Category(name=cat_name, type=cat_type))
    db.session.commit()

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    transactions = Transaction.query.order_by(Transaction.date.desc()).all()
    return jsonify([{
        'id': t.id,
        'type': t.type,
        'category': t.category,
        'amount': t.amount,
        'date': t.date.strftime('%Y-%m-%d'),
        'description': t.description,
        'is_recurring': t.is_recurring
    } for t in transactions])

@app.route('/api/transactions', methods=['POST'])
def add_transaction():
    data = request.json
    transaction = Transaction(
        type=data['type'],
        category=data['category'],
        amount=data['amount'],
        date=datetime.strptime(data['date'], '%Y-%m-%d'),
        description=data['description'],
        is_recurring=data.get('is_recurring', False)
    )
    db.session.add(transaction)
    db.session.commit()
    return jsonify({'message': 'İşlem başarıyla eklendi', 'id': transaction.id})

@app.route('/api/transactions/<int:id>', methods=['DELETE'])
def delete_transaction(id):
    transaction = Transaction.query.get_or_404(id)
    db.session.delete(transaction)
    db.session.commit()
    return jsonify({'message': 'İşlem başarıyla silindi'})

@app.route('/api/categories', methods=['GET'])
def get_categories():
    categories = Category.query.all()
    return jsonify([{
        'id': c.id,
        'name': c.name,
        'type': c.type
    } for c in categories])

@app.route('/api/categories', methods=['POST'])
def add_category():
    data = request.json
    category = Category(name=data['name'], type=data['type'])
    db.session.add(category)
    db.session.commit()
    return jsonify({'message': 'Kategori başarıyla eklendi', 'id': category.id})

@app.route('/api/report/monthly', methods=['GET'])
def get_monthly_report():
    year = request.args.get('year', datetime.now().year)
    month = request.args.get('month', datetime.now().month)
    
    start_date = f"{year}-{month:02d}-01"
    end_date = f"{year}-{month:02d}-{calendar.monthrange(int(year), int(month))[1]}"
    
    transactions = Transaction.query.filter(
        Transaction.date.between(start_date, end_date)
    ).all()
    

    html_content = render_template(
        'report_template.html',
        transactions=transactions,
        month=calendar.month_name[int(month)],
        year=year
    )
    
    pdf = pdfkit.from_string(html_content, False)
    

    pdf_buffer = BytesIO(pdf)
    pdf_buffer.seek(0)
    
    return send_file(
        pdf_buffer,
        download_name=f'butce_raporu_{year}_{month}.pdf',
        mimetype='application/pdf'
    )

if __name__ == '__main__':
    app.run(debug=True)