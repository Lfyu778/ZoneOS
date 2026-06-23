## 社区物业管理系统

数据库课程设计作品，基于 MySQL + Python Flask + Tailwind CSS。

### 快速启动

```bash
# 1. 建库（MySQL 8.0+）
mysql -u root -p < sql/schema.sql
mysql -u root -p < sql/testdata.sql

# 2. 启动应用
cd app
pip install -r requirements.txt
# 修改 config.py 中的数据库密码
python app.py

# 3. 访问
# 浏览器打开 http://localhost:5000
```

### 数据库概况

| 指标 | 数量 |
|------|------|
| 数据表 | 13张 |
| 触发器 | 6个 |
| 存储过程 | 6个 |
| 外键关系 | 15条 |

### 功能模块

控制台、楼栋管理、房屋管理、住户管理、车位管理、车辆登记、物业费管理、报修工单、投诉建议、公告通知、访客登记、工作人员管理

### 技术栈

- **数据库**：MySQL 8.0
- **后端**：Python 3 + Flask + PyMySQL
- **前端**：HTML5 + Tailwind CSS + 原生JavaScript
