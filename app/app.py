"""
社区物业管理系统 - Flask后端
数据库课程设计作品
"""
from flask import Flask, jsonify, request, render_template, send_from_directory, session
from flask_cors import CORS
import pymysql
from config import DB_CONFIG, SECRET_KEY
from datetime import date, datetime
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
import decimal
import json

app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = SECRET_KEY
CORS(app, supports_credentials=True)


# ======================== 认证装饰器 ========================
def login_required(f):
    """要求用户已登录"""
    @wraps(f)
    def wrapper(*args, **kwargs):
        if 'user_id' not in session:
            return err('请先登录', 401)
        return f(*args, **kwargs)
    return wrapper


def admin_required(f):
    """要求管理员权限（写操作）"""
    @wraps(f)
    def wrapper(*args, **kwargs):
        if 'user_id' not in session:
            return err('请先登录', 401)
        if session.get('role') != 'admin':
            return err('权限不足，仅管理员可操作', 403)
        return f(*args, **kwargs)
    return wrapper


# ======================== 数据库工具 ========================
def get_db():
    """获取数据库连接"""
    return pymysql.connect(
        host=DB_CONFIG['host'],
        port=DB_CONFIG['port'],
        user=DB_CONFIG['user'],
        password=DB_CONFIG['password'],
        database=DB_CONFIG['database'],
        charset=DB_CONFIG['charset'],
        cursorclass=pymysql.cursors.DictCursor
    )


def json_serial(obj):
    """JSON序列化辅助：处理 date / datetime / Decimal"""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, decimal.Decimal):
        return float(obj)
    raise TypeError(f"Type {type(obj)} not serializable")


def ok(data):
    return app.response_class(
        response=json.dumps(data, default=json_serial, ensure_ascii=False),
        mimetype='application/json'
    )


def err(msg, code=500):
    return ok({'error': msg}), code




# ======================== 首页 ========================
@app.route('/')
def index():
    return render_template('index.html')


# ======================== 认证 API ========================
@app.route('/api/login', methods=['POST'])
def login():
    db = get_db()
    try:
        d = request.json
        username = d.get('username', '').strip()
        password = d.get('password', '')
        if not username or not password:
            return err('用户名和密码不能为空', 400)
        cur = db.cursor()
        cur.execute('SELECT * FROM users WHERE username = %s', (username,))
        user = cur.fetchone()
        if not user or not check_password_hash(user['password_hash'], password):
            return err('用户名或密码错误', 401)
        session['user_id'] = user['user_id']
        session['username'] = user['username']
        session['role'] = user['role']
        session['nickname'] = user['nickname'] or user['username']
        return ok({
            'user_id': user['user_id'],
            'username': user['username'],
            'role': user['role'],
            'nickname': user['nickname'] or user['username'],
            'message': '登录成功'
        })
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return ok({'message': '已退出登录'})


@app.route('/api/me')
def get_me():
    if 'user_id' not in session:
        return ok({'user_id': None})
    return ok({
        'user_id': session['user_id'],
        'username': session['username'],
        'role': session['role'],
        'nickname': session.get('nickname', session['username'])
    })


# ======================== 控制台统计 ========================
@app.route('/api/dashboard')
@login_required
def dashboard():
    db = get_db()
    try:
        cur = db.cursor()
        cur.execute('SELECT COUNT(*) as c FROM buildings')
        buildings = cur.fetchone()['c']
        cur.execute("SELECT COUNT(*) as total, SUM(CASE WHEN status='已入住' THEN 1 ELSE 0 END) as occupied FROM rooms")
        rooms = cur.fetchone()
        cur.execute('SELECT COUNT(*) as c FROM residents')
        residents = cur.fetchone()['c']
        cur.execute("SELECT COUNT(*) as total, SUM(CASE WHEN status='空闲' THEN 1 ELSE 0 END) as available FROM parking_spaces")
        parking = cur.fetchone()
        cur.execute("SELECT COUNT(*) as total, SUM(CASE WHEN status IN ('待处理','处理中') THEN 1 ELSE 0 END) as pending FROM repair_orders")
        repairs = cur.fetchone()
        cur.execute("SELECT COUNT(*) as total, SUM(CASE WHEN status='待处理' THEN 1 ELSE 0 END) as pending FROM complaints")
        complaints = cur.fetchone()
        cur.execute("SELECT COUNT(*) as total, SUM(CASE WHEN status IN ('待缴','逾期') THEN 1 ELSE 0 END) as unpaid FROM fee_records")
        fees = cur.fetchone()
        cur.execute("SELECT * FROM announcements ORDER BY is_top DESC, created_at DESC LIMIT 5")
        announcements = cur.fetchall()
        return ok({
            'buildings': buildings, 'rooms': rooms, 'residents': residents,
            'parking': parking, 'repairs': repairs, 'complaints': complaints,
            'fees': fees, 'announcements': announcements
        })
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


# ======================== 楼栋管理 ========================
@app.route('/api/buildings')
@login_required
def get_buildings():
    db = get_db()
    try:
        cur = db.cursor()
        cur.execute("""
            SELECT b.*, COUNT(DISTINCT u.unit_id) as unit_count, COUNT(DISTINCT r.room_id) as room_count
            FROM buildings b
            LEFT JOIN units u ON u.building_id = b.building_id
            LEFT JOIN rooms r ON r.unit_id = u.unit_id
            GROUP BY b.building_id ORDER BY b.building_id
        """)
        return ok(cur.fetchall())
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


@app.route('/api/buildings', methods=['POST'])
@admin_required
def add_building():
    db = get_db()
    try:
        d = request.json
        cur = db.cursor()
        cur.execute('INSERT INTO buildings (building_name, total_floors, address) VALUES (%s,%s,%s)',
                    (d['building_name'], d['total_floors'], d.get('address', '')))
        db.commit()
        return ok({'id': cur.lastrowid, 'message': '添加成功'})
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


@app.route('/api/buildings/<int:id>', methods=['PUT'])
@admin_required
def update_building(id):
    db = get_db()
    try:
        d = request.json
        cur = db.cursor()
        cur.execute('UPDATE buildings SET building_name=%s, total_floors=%s, address=%s WHERE building_id=%s',
                    (d['building_name'], d['total_floors'], d.get('address', ''), id))
        db.commit()
        return ok({'message': '更新成功'})
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


@app.route('/api/buildings/<int:id>', methods=['DELETE'])
@admin_required
def del_building(id):
    db = get_db()
    try:
        cur = db.cursor()
        cur.execute('DELETE FROM buildings WHERE building_id=%s', (id,))
        db.commit()
        return ok({'message': '删除成功'})
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


# ======================== 单元管理 ========================
@app.route('/api/units')
@login_required
def get_units():
    db = get_db()
    try:
        cur = db.cursor()
        cur.execute("""
            SELECT u.*, b.building_name, COUNT(DISTINCT r.room_id) as room_count
            FROM units u
            JOIN buildings b ON u.building_id = b.building_id
            LEFT JOIN rooms r ON r.unit_id = u.unit_id
            GROUP BY u.unit_id ORDER BY b.building_id, u.unit_number
        """)
        return ok(cur.fetchall())
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


@app.route('/api/units', methods=['POST'])
@admin_required
def add_unit():
    db = get_db()
    try:
        d = request.json
        cur = db.cursor()
        cur.execute('INSERT INTO units (building_id, unit_number, floors) VALUES (%s,%s,%s)',
                    (d['building_id'], d['unit_number'], d['floors']))
        db.commit()
        return ok({'id': cur.lastrowid, 'message': '添加成功'})
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


# ======================== 房屋管理 ========================
@app.route('/api/rooms')
@login_required
def get_rooms():
    db = get_db()
    try:
        cur = db.cursor()
        cur.execute("""
            SELECT r.*, b.building_name, u.unit_number,
                   CONCAT(b.building_name, ' ', u.unit_number, ' ', r.room_number) as full_address
            FROM rooms r
            JOIN units u ON r.unit_id = u.unit_id
            JOIN buildings b ON u.building_id = b.building_id
            ORDER BY b.building_id, u.unit_id, r.room_number
        """)
        return ok(cur.fetchall())
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


@app.route('/api/rooms', methods=['POST'])
@admin_required
def add_room():
    db = get_db()
    try:
        d = request.json
        cur = db.cursor()
        cur.execute('INSERT INTO rooms (unit_id, room_number, area, room_type) VALUES (%s,%s,%s,%s)',
                    (d['unit_id'], d['room_number'], d['area'], d.get('room_type', '住宅')))
        db.commit()
        return ok({'id': cur.lastrowid, 'message': '添加成功'})
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


# ======================== 住户管理 ========================
@app.route('/api/residents')
@login_required
def get_residents():
    db = get_db()
    try:
        cur = db.cursor()
        cur.execute("""
            SELECT res.*, r.room_number, r.area, b.building_name, u.unit_number,
                   CONCAT(b.building_name, ' ', u.unit_number, ' ', r.room_number) as full_address
            FROM residents res
            JOIN rooms r ON res.room_id = r.room_id
            JOIN units u ON r.unit_id = u.unit_id
            JOIN buildings b ON u.building_id = b.building_id
            ORDER BY b.building_id, u.unit_number, r.room_number
        """)
        return ok(cur.fetchall())
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


@app.route('/api/residents', methods=['POST'])
@admin_required
def add_resident():
    db = get_db()
    try:
        d = request.json
        cur = db.cursor()
        cur.execute("""
            INSERT INTO residents (room_id, name, gender, phone, id_card, relationship, move_in_date)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
        """, (d['room_id'], d['name'], d['gender'], d['phone'], d['id_card'],
              d.get('relationship', '业主'), d['move_in_date']))
        db.commit()
        return ok({'id': cur.lastrowid, 'message': '添加成功'})
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


@app.route('/api/residents/<int:id>', methods=['PUT'])
@admin_required
def update_resident(id):
    db = get_db()
    try:
        d = request.json
        cur = db.cursor()
        cur.execute("""
            UPDATE residents SET room_id=%s, name=%s, gender=%s, phone=%s,
                                 id_card=%s, relationship=%s, move_in_date=%s
            WHERE resident_id=%s
        """, (d['room_id'], d['name'], d['gender'], d['phone'],
              d['id_card'], d.get('relationship', '业主'), d['move_in_date'], id))
        db.commit()
        return ok({'message': '更新成功'})
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


@app.route('/api/residents/<int:id>/overview')
@login_required
def resident_overview(id):
    db = get_db()
    try:
        cur = db.cursor()
        cur.callproc('sp_resident_overview', (id,))
        info = cur.fetchone() or {}
        # 读取后续结果集
        unpaid_fees = []
        recent_repairs = []
        while cur.nextset():
            rows = cur.fetchall()
            if not unpaid_fees and rows:
                unpaid_fees = rows
            elif rows:
                recent_repairs = rows
        return ok({'info': info, 'unpaid_fees': unpaid_fees, 'recent_repairs': recent_repairs})
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


# ======================== 车位管理 ========================
@app.route('/api/parking')
@login_required
def get_parking():
    db = get_db()
    try:
        cur = db.cursor()
        cur.execute("""
            SELECT ps.*, v.plate_no, v.vehicle_type, res.name as resident_name
            FROM parking_spaces ps
            LEFT JOIN vehicles v ON v.space_id = ps.space_id
            LEFT JOIN residents res ON v.resident_id = res.resident_id
            ORDER BY ps.space_number
        """)
        return ok(cur.fetchall())
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


@app.route('/api/parking/stats')
@login_required
def parking_stats():
    db = get_db()
    try:
        cur = db.cursor()
        cur.callproc('sp_parking_statistics')
        overview = cur.fetchone() or {}
        by_area = []
        if cur.nextset():
            by_area = cur.fetchall()
        return ok({'overview': overview, 'by_area': by_area})
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


# ======================== 车辆登记 ========================
@app.route('/api/vehicles')
@login_required
def get_vehicles():
    db = get_db()
    try:
        cur = db.cursor()
        cur.execute("""
            SELECT v.*, res.name as resident_name, ps.space_number
            FROM vehicles v
            JOIN residents res ON v.resident_id = res.resident_id
            LEFT JOIN parking_spaces ps ON v.space_id = ps.space_id
            ORDER BY v.vehicle_id
        """)
        return ok(cur.fetchall())
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


@app.route('/api/vehicles', methods=['POST'])
@admin_required
def add_vehicle():
    db = get_db()
    try:
        d = request.json
        cur = db.cursor()
        cur.execute("""
            INSERT INTO vehicles (resident_id, space_id, plate_no, vehicle_type, color)
            VALUES (%s,%s,%s,%s,%s)
        """, (d['resident_id'], d.get('space_id'), d['plate_no'],
              d.get('vehicle_type', '轿车'), d.get('color', '')))
        db.commit()
        return ok({'id': cur.lastrowid, 'message': '添加成功'})
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


@app.route('/api/vehicles/<int:id>', methods=['PUT'])
@admin_required
def update_vehicle(id):
    db = get_db()
    try:
        d = request.json
        cur = db.cursor()
        cur.execute("""
            UPDATE vehicles SET resident_id=%s, space_id=%s, plate_no=%s,
                                vehicle_type=%s, color=%s
            WHERE vehicle_id=%s
        """, (d['resident_id'], d.get('space_id'), d['plate_no'],
              d.get('vehicle_type', '轿车'), d.get('color', ''), id))
        db.commit()
        return ok({'message': '更新成功'})
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


# ======================== 物业费管理 ========================
@app.route('/api/fees')
@login_required
def get_fees():
    db = get_db()
    try:
        cur = db.cursor()
        period = request.args.get('period')
        sql = """
            SELECT fr.*, fc.category_name, res.name as resident_name,
                   CONCAT(b.building_name, ' ', u.unit_number, ' ', r.room_number) as full_address
            FROM fee_records fr
            JOIN fee_categories fc ON fr.category_id = fc.category_id
            JOIN residents res ON fr.resident_id = res.resident_id
            JOIN rooms r ON res.room_id = r.room_id
            JOIN units u ON r.unit_id = u.unit_id
            JOIN buildings b ON u.building_id = b.building_id
        """
        params = []
        if period:
            sql += ' WHERE fr.fee_period = %s'
            params.append(period)
        sql += ' ORDER BY fr.fee_period DESC, res.name'
        cur.execute(sql, params)
        return ok(cur.fetchall())
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


@app.route('/api/fees/pay', methods=['POST'])
@admin_required
def pay_fee():
    db = get_db()
    try:
        d = request.json
        cur = db.cursor()
        cur.callproc('sp_pay_fee', (d['fee_id'], d['amount']))
        result = cur.fetchone()
        db.commit()
        return ok(result or {'message': '缴费成功'})
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


@app.route('/api/fees/generate', methods=['POST'])
@admin_required
def generate_fees():
    db = get_db()
    try:
        d = request.json
        cur = db.cursor()
        cur.callproc('sp_generate_monthly_fees', (d['period'],))
        result = cur.fetchone()
        db.commit()
        return ok(result or {'message': '生成成功'})
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


@app.route('/api/fees/report/<period>')
@login_required
def fee_report(period):
    db = get_db()
    try:
        cur = db.cursor()
        cur.callproc('sp_monthly_fee_report', (period,))
        return ok(cur.fetchall())
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


@app.route('/api/fee-categories')
@login_required
def get_fee_categories():
    db = get_db()
    try:
        cur = db.cursor()
        cur.execute('SELECT * FROM fee_categories')
        return ok(cur.fetchall())
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


# ======================== 报修工单 ========================
@app.route('/api/repairs')
@login_required
def get_repairs():
    db = get_db()
    try:
        cur = db.cursor()
        cur.execute("""
            SELECT ro.*, res.name as resident_name, res.phone as resident_phone,
                   s.name as staff_name,
                   CONCAT(b.building_name, ' ', u.unit_number, ' ', r.room_number) as full_address
            FROM repair_orders ro
            JOIN residents res ON ro.resident_id = res.resident_id
            JOIN rooms r ON res.room_id = r.room_id
            JOIN units u ON r.unit_id = u.unit_id
            JOIN buildings b ON u.building_id = b.building_id
            LEFT JOIN staff s ON ro.staff_id = s.staff_id
            ORDER BY FIELD(ro.status, '待处理','处理中','已完成','已取消'), ro.created_at DESC
        """)
        return ok(cur.fetchall())
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


@app.route('/api/repairs', methods=['POST'])
@admin_required
def add_repair():
    db = get_db()
    try:
        d = request.json
        cur = db.cursor()
        cur.execute("""
            INSERT INTO repair_orders (resident_id, title, description, location, priority)
            VALUES (%s,%s,%s,%s,%s)
        """, (d['resident_id'], d['title'], d.get('description', ''),
              d.get('location', ''), d.get('priority', '中')))
        db.commit()
        return ok({'id': cur.lastrowid, 'message': '提交成功'})
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


@app.route('/api/repairs/<int:id>', methods=['PUT'])
@admin_required
def update_repair(id):
    db = get_db()
    try:
        d = request.json
        cur = db.cursor()
        if d.get('status'):
            cur.execute('UPDATE repair_orders SET staff_id=%s, status=%s WHERE order_id=%s',
                        (d.get('staff_id'), d['status'], id))
        db.commit()
        return ok({'message': '更新成功'})
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


# ======================== 投诉建议 ========================
@app.route('/api/complaints')
@login_required
def get_complaints():
    db = get_db()
    try:
        cur = db.cursor()
        cur.execute("""
            SELECT c.*, res.name as resident_name, res.phone as resident_phone
            FROM complaints c
            JOIN residents res ON c.resident_id = res.resident_id
            ORDER BY FIELD(c.status, '待处理','处理中','已解决','已关闭'), c.created_at DESC
        """)
        return ok(cur.fetchall())
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


@app.route('/api/complaints', methods=['POST'])
@admin_required
def add_complaint():
    db = get_db()
    try:
        d = request.json
        cur = db.cursor()
        cur.execute("""
            INSERT INTO complaints (resident_id, title, content, complaint_type)
            VALUES (%s,%s,%s,%s)
        """, (d['resident_id'], d['title'], d['content'], d.get('complaint_type', '投诉')))
        db.commit()
        return ok({'id': cur.lastrowid, 'message': '提交成功'})
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


@app.route('/api/complaints/<int:id>', methods=['PUT'])
@admin_required
def update_complaint(id):
    db = get_db()
    try:
        d = request.json
        cur = db.cursor()
        cur.execute('UPDATE complaints SET status=%s, reply=%s WHERE complaint_id=%s',
                    (d['status'], d.get('reply', ''), id))
        db.commit()
        return ok({'message': '更新成功'})
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


# ======================== 公告管理 ========================
@app.route('/api/announcements')
@login_required
def get_announcements():
    db = get_db()
    try:
        cur = db.cursor()
        cur.execute('SELECT * FROM announcements ORDER BY is_top DESC, created_at DESC')
        return ok(cur.fetchall())
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


@app.route('/api/announcements', methods=['POST'])
@admin_required
def add_announcement():
    db = get_db()
    try:
        d = request.json
        cur = db.cursor()
        cur.execute("""
            INSERT INTO announcements (title, content, ann_type, publisher, is_top)
            VALUES (%s,%s,%s,%s,%s)
        """, (d['title'], d['content'], d.get('ann_type', '通知'),
              d.get('publisher', '物业服务中心'), d.get('is_top', False)))
        db.commit()
        return ok({'id': cur.lastrowid, 'message': '发布成功'})
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


@app.route('/api/announcements/<int:id>', methods=['PUT'])
@admin_required
def update_announcement(id):
    db = get_db()
    try:
        d = request.json
        cur = db.cursor()
        cur.execute("""
            UPDATE announcements SET title=%s, content=%s, ann_type=%s,
                                     publisher=%s, is_top=%s
            WHERE announcement_id=%s
        """, (d['title'], d['content'], d.get('ann_type', '通知'),
              d.get('publisher', '物业服务中心'), d.get('is_top', False), id))
        db.commit()
        return ok({'message': '更新成功'})
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


@app.route('/api/announcements/<int:id>', methods=['DELETE'])
@admin_required
def del_announcement(id):
    db = get_db()
    try:
        cur = db.cursor()
        cur.execute('DELETE FROM announcements WHERE announcement_id=%s', (id,))
        db.commit()
        return ok({'message': '删除成功'})
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


# ======================== 访客登记 ========================
@app.route('/api/visitors')
@login_required
def get_visitors():
    db = get_db()
    try:
        cur = db.cursor()
        cur.execute("""
            SELECT v.*, res.name as resident_name,
                   CONCAT(b.building_name, ' ', u.unit_number, ' ', r.room_number) as full_address
            FROM visitor_records v
            JOIN residents res ON v.resident_id = res.resident_id
            JOIN rooms r ON res.room_id = r.room_id
            JOIN units u ON r.unit_id = u.unit_id
            JOIN buildings b ON u.building_id = b.building_id
            ORDER BY v.entry_time DESC
        """)
        return ok(cur.fetchall())
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


@app.route('/api/visitors', methods=['POST'])
@admin_required
def add_visitor():
    db = get_db()
    try:
        d = request.json
        cur = db.cursor()
        cur.execute("""
            INSERT INTO visitor_records (resident_id, visitor_name, visitor_phone, purpose, remark)
            VALUES (%s,%s,%s,%s,%s)
        """, (d['resident_id'], d['visitor_name'], d.get('visitor_phone', ''),
              d.get('purpose', '探访'), d.get('remark', '')))
        db.commit()
        return ok({'id': cur.lastrowid, 'message': '登记成功'})
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


@app.route('/api/visitors/<int:id>/exit', methods=['PUT'])
@admin_required
def visitor_exit(id):
    db = get_db()
    try:
        cur = db.cursor()
        cur.execute('UPDATE visitor_records SET exit_time = NOW() WHERE visitor_id=%s', (id,))
        db.commit()
        return ok({'message': '已登记离开'})
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


# ======================== 工作人员 ========================
@app.route('/api/staff')
@login_required
def get_staff():
    db = get_db()
    try:
        cur = db.cursor()
        cur.execute('SELECT * FROM staff ORDER BY status, staff_id')
        return ok(cur.fetchall())
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


@app.route('/api/staff', methods=['POST'])
@admin_required
def add_staff():
    db = get_db()
    try:
        d = request.json
        cur = db.cursor()
        cur.execute("""
            INSERT INTO staff (name, gender, phone, role, salary, hire_date)
            VALUES (%s,%s,%s,%s,%s,%s)
        """, (d['name'], d['gender'], d['phone'], d['role'],
              d.get('salary', 0), d['hire_date']))
        db.commit()
        return ok({'id': cur.lastrowid, 'message': '添加成功'})
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


@app.route('/api/staff/<int:id>', methods=['PUT'])
@admin_required
def update_staff(id):
    db = get_db()
    try:
        d = request.json
        cur = db.cursor()
        if 'name' in d:
            cur.execute("""
                UPDATE staff SET name=%s, gender=%s, phone=%s, role=%s,
                                 salary=%s, status=%s
                WHERE staff_id=%s
            """, (d['name'], d.get('gender', '男'), d['phone'], d['role'],
                  d.get('salary', 0), d.get('status', '在职'), id))
        else:
            cur.execute('UPDATE staff SET status=%s WHERE staff_id=%s', (d['status'], id))
        db.commit()
        return ok({'message': '更新成功'})
    except Exception as e:
        return err(str(e))
    finally:
        db.close()


# ======================== 初始化默认用户 ========================
def init_default_users():
    """首次启动时自动创建默认账户"""
    db = get_db()
    try:
        cur = db.cursor()
        cur.execute('SELECT COUNT(*) as c FROM users')
        if cur.fetchone()['c'] > 0:
            return
        users = [
            ('admin', generate_password_hash('admin123'), 'admin', '管理员'),
            ('user',  generate_password_hash('user123'),  'user',  '普通用户'),
        ]
        cur.executemany(
            'INSERT INTO users (username, password_hash, role, nickname) VALUES (%s,%s,%s,%s)',
            users
        )
        db.commit()
        print('已创建默认账户: admin/admin123, user/user123')
    except Exception as e:
        print(f'初始化用户失败: {e}')
    finally:
        db.close()


# ======================== 启动 ========================
if __name__ == '__main__':
    init_default_users()
    print('社区物业管理系统已启动: http://localhost:5000')
    app.run(debug=True, host='0.0.0.0', port=5000)
