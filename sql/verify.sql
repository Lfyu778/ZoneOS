-- ================================================================
-- 社区物业管理系统 - 验证脚本
-- 用于验证表结构、触发器、存储过程的正确性
-- ================================================================

USE community_property;

-- ================================================================
-- 1. 查看所有表
-- ================================================================
SELECT TABLE_NAME AS '表名', TABLE_COMMENT AS '说明', TABLE_ROWS AS '预估行数'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'community_property'
ORDER BY TABLE_NAME;

-- ================================================================
-- 2. 查看所有外键关系
-- ================================================================
SELECT
    CONSTRAINT_NAME AS '约束名',
    TABLE_NAME AS '从表',
    COLUMN_NAME AS '从字段',
    REFERENCED_TABLE_NAME AS '主表',
    REFERENCED_COLUMN_NAME AS '主字段'
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'community_property'
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME;

-- ================================================================
-- 3. 查看所有触发器
-- ================================================================
SELECT
    TRIGGER_NAME AS '触发器名',
    EVENT_MANIPULATION AS '事件',
    EVENT_OBJECT_TABLE AS '表名',
    ACTION_TIMING AS '时机'
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = 'community_property';

-- ================================================================
-- 4. 查看所有存储过程
-- ================================================================
SELECT
    ROUTINE_NAME AS '存储过程名',
    ROUTINE_TYPE AS '类型',
    CREATED AS '创建时间'
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'community_property'
  AND ROUTINE_TYPE = 'PROCEDURE';

-- ================================================================
-- 5. 验证触发器1：自动计算物业费金额
-- ================================================================
-- 插入一条按面积计算的物业费记录（住户1 = 张伟，房间89.50㎡，物业管理费2.5元/㎡）
INSERT INTO fee_records (resident_id, category_id, amount, fee_period, due_date)
VALUES (1, 1, 0, '2026-07', '2026-07-25');

SELECT fee_id, resident_id, category_id, amount, fee_period
FROM fee_records WHERE fee_period = '2026-07';
-- 预期：amount 应为 223.75 (89.50 × 2.5)

-- 清理
DELETE FROM fee_records WHERE fee_period = '2026-07';

-- ================================================================
-- 6. 验证触发器2：缴费后自动更新状态
-- ================================================================
-- 找一条待缴的记录
SELECT fee_id, amount, paid_amount, status FROM fee_records WHERE status = '待缴' LIMIT 1;
-- 假设取到 fee_id = X，执行缴费
-- CALL sp_pay_fee(X, 249.50);  -- 使用存储过程缴费
-- 再次查看，status 应变为 '已缴'

-- ================================================================
-- 7. 验证触发器3：报修完成自动填充时间
-- ================================================================
-- 找一条未完成的报修单
SELECT order_id, status, completed_at FROM repair_orders WHERE status != '已完成' LIMIT 1;
-- 更新为已完成
UPDATE repair_orders SET status = '已完成' WHERE order_id = 3;
SELECT order_id, status, completed_at FROM repair_orders WHERE order_id = 3;
-- 预期：completed_at 已自动填入当前时间

-- ================================================================
-- 8. 验证触发器4：投诉解决自动填充时间
-- ================================================================
UPDATE complaints SET status = '已解决' WHERE complaint_id = 3;
SELECT complaint_id, status, resolved_at FROM complaints WHERE complaint_id = 3;
-- 预期：resolved_at 已自动填入当前时间

-- ================================================================
-- 9. 验证触发器5：新住户入住自动更新房屋状态
-- ================================================================
-- 查看room_id=4（当前空置）
SELECT room_id, room_number, status FROM rooms WHERE room_id = 4;
-- 插入新住户
INSERT INTO residents (room_id, name, gender, phone, id_card, relationship, move_in_date)
VALUES (4, '测试住户', '男', '13800000000', '999999200001011234', '业主', '2026-06-23');
SELECT room_id, room_number, status FROM rooms WHERE room_id = 4;
-- 预期：status 变为 '已入住'

-- 清理
DELETE FROM residents WHERE id_card = '999999200001011234';
UPDATE rooms SET status = '空置' WHERE room_id = 4;

-- ================================================================
-- 10. 验证存储过程：批量生成物业费
-- ================================================================
CALL sp_generate_monthly_fees('2026-07');
SELECT COUNT(*) AS '7月账单数量' FROM fee_records WHERE fee_period = '2026-07';
-- 预期：每位入住住户 × 费用类别数 条记录

-- ================================================================
-- 11. 验证存储过程：查询报修详情
-- ================================================================
CALL sp_get_repair_detail(1);

-- ================================================================
-- 12. 验证存储过程：车位统计
-- ================================================================
CALL sp_parking_statistics();

-- ================================================================
-- 13. 验证存储过程：月度收费报表
-- ================================================================
CALL sp_monthly_fee_report('2026-06');

-- ================================================================
-- 14. 验证存储过程：住户综合信息
-- ================================================================
CALL sp_resident_overview(1);

-- ================================================================
-- 15. 综合统计查询
-- ================================================================
-- 小区概况
SELECT
    (SELECT COUNT(*) FROM buildings) AS '楼栋数',
    (SELECT COUNT(*) FROM units) AS '单元数',
    (SELECT COUNT(*) FROM rooms) AS '房屋数',
    (SELECT COUNT(*) FROM residents) AS '住户数',
    (SELECT COUNT(*) FROM parking_spaces) AS '车位数',
    (SELECT COUNT(*) FROM vehicles) AS '登记车辆数',
    (SELECT COUNT(*) FROM staff) AS '工作人员数';
