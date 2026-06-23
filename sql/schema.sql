-- ================================================================
-- 社区物业管理系统 - 数据库脚本
-- 数据库：MySQL 8.0+
-- 包含：建表语句、触发器(6个)、存储过程(6个)
-- ================================================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS community_property
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE community_property;

-- ================================================================
-- 一、表结构定义（共13张表）
-- ================================================================

-- 1. 楼栋表
CREATE TABLE buildings (
    building_id   INT PRIMARY KEY AUTO_INCREMENT,
    building_name VARCHAR(50)  NOT NULL UNIQUE COMMENT '楼栋名称，如A栋',
    total_floors  INT          NOT NULL CHECK (total_floors > 0) COMMENT '总楼层数',
    address       VARCHAR(200) COMMENT '楼栋地址描述',
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='楼栋信息';

-- 2. 单元表
CREATE TABLE units (
    unit_id      INT PRIMARY KEY AUTO_INCREMENT,
    building_id  INT         NOT NULL,
    unit_number  VARCHAR(20) NOT NULL COMMENT '单元编号，如1单元',
    floors       INT         NOT NULL CHECK (floors > 0),
    created_at   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (building_id) REFERENCES buildings(building_id) ON DELETE CASCADE,
    UNIQUE KEY uk_building_unit (building_id, unit_number)
) ENGINE=InnoDB COMMENT='单元信息';

-- 3. 房屋表
CREATE TABLE rooms (
    room_id     INT PRIMARY KEY AUTO_INCREMENT,
    unit_id     INT            NOT NULL,
    room_number VARCHAR(20)    NOT NULL COMMENT '房间号，如101',
    area        DECIMAL(10,2)  NOT NULL CHECK (area > 0) COMMENT '面积（平方米）',
    room_type   ENUM('住宅','商铺','储藏室') NOT NULL DEFAULT '住宅',
    status      ENUM('空置','已入住','装修中') NOT NULL DEFAULT '空置',
    created_at  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (unit_id) REFERENCES units(unit_id) ON DELETE CASCADE,
    UNIQUE KEY uk_unit_room (unit_id, room_number)
) ENGINE=InnoDB COMMENT='房屋信息';

-- 4. 住户表
CREATE TABLE residents (
    resident_id  INT PRIMARY KEY AUTO_INCREMENT,
    room_id      INT          NOT NULL,
    name         VARCHAR(50)  NOT NULL,
    gender       ENUM('男','女') NOT NULL,
    phone        VARCHAR(20)  NOT NULL,
    id_card      VARCHAR(18)  NOT NULL UNIQUE COMMENT '身份证号',
    relationship ENUM('业主','家属','租客') NOT NULL DEFAULT '业主',
    move_in_date DATE         NOT NULL,
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='住户信息';

-- 5. 车位表
CREATE TABLE parking_spaces (
    space_id      INT PRIMARY KEY AUTO_INCREMENT,
    space_number  VARCHAR(20) NOT NULL UNIQUE COMMENT '车位编号',
    area_name     VARCHAR(50) NOT NULL DEFAULT '地下停车场' COMMENT '区域名称',
    space_type    ENUM('普通','大型','充电') NOT NULL DEFAULT '普通',
    status        ENUM('空闲','已租','已售','维修中') NOT NULL DEFAULT '空闲',
    monthly_price DECIMAL(10,2) NOT NULL DEFAULT 300.00,
    created_at    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='车位信息';

-- 6. 车辆登记表
CREATE TABLE vehicles (
    vehicle_id  INT PRIMARY KEY AUTO_INCREMENT,
    resident_id INT          NOT NULL,
    space_id    INT          DEFAULT NULL COMMENT '绑定车位',
    plate_no    VARCHAR(20)  NOT NULL UNIQUE COMMENT '车牌号',
    vehicle_type ENUM('轿车','SUV','电动车','摩托车') NOT NULL DEFAULT '轿车',
    color       VARCHAR(20),
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resident_id) REFERENCES residents(resident_id) ON DELETE CASCADE,
    FOREIGN KEY (space_id) REFERENCES parking_spaces(space_id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='车辆登记';

-- 7. 物业费类别表
CREATE TABLE fee_categories (
    category_id   INT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(50) NOT NULL UNIQUE COMMENT '费用类别名称',
    billing_cycle ENUM('月','季','年') NOT NULL DEFAULT '月' COMMENT '计费周期',
    calc_method   ENUM('固定','按面积','按用量') NOT NULL DEFAULT '固定' COMMENT '计费方式',
    unit_price    DECIMAL(10,4) NOT NULL DEFAULT 0 COMMENT '单价',
    description   VARCHAR(200)
) ENGINE=InnoDB COMMENT='物业费类别';

-- 8. 物业费记录表
CREATE TABLE fee_records (
    fee_id       INT PRIMARY KEY AUTO_INCREMENT,
    resident_id  INT          NOT NULL,
    category_id  INT          NOT NULL,
    amount       DECIMAL(10,2) NOT NULL COMMENT '应缴金额',
    paid_amount  DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '已缴金额',
    fee_period   VARCHAR(20)  NOT NULL COMMENT '费用周期，如2024-01',
    status       ENUM('待缴','已缴','逾期','部分缴纳') NOT NULL DEFAULT '待缴',
    due_date     DATE         NOT NULL,
    paid_date    DATE         DEFAULT NULL,
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resident_id) REFERENCES residents(resident_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES fee_categories(category_id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='物业费记录';

-- 9. 工作人员表
CREATE TABLE staff (
    staff_id    INT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(50)  NOT NULL,
    gender      ENUM('男','女') NOT NULL,
    phone       VARCHAR(20)  NOT NULL,
    role        ENUM('经理','维修工','保安','保洁') NOT NULL,
    salary      DECIMAL(10,2) NOT NULL DEFAULT 0,
    hire_date   DATE         NOT NULL,
    status      ENUM('在职','离职') NOT NULL DEFAULT '在职',
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='工作人员';

-- 10. 报修工单表
CREATE TABLE repair_orders (
    order_id     INT PRIMARY KEY AUTO_INCREMENT,
    resident_id  INT          NOT NULL,
    staff_id     INT          DEFAULT NULL COMMENT '指派维修人员',
    title        VARCHAR(100) NOT NULL COMMENT '报修标题',
    description  TEXT         COMMENT '问题描述',
    location     VARCHAR(200) COMMENT '报修地点',
    priority     ENUM('低','中','高','紧急') NOT NULL DEFAULT '中',
    status       ENUM('待处理','处理中','已完成','已取消') NOT NULL DEFAULT '待处理',
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP    NULL,
    FOREIGN KEY (resident_id) REFERENCES residents(resident_id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='报修工单';

-- 11. 投诉建议表
CREATE TABLE complaints (
    complaint_id  INT PRIMARY KEY AUTO_INCREMENT,
    resident_id   INT          NOT NULL,
    title         VARCHAR(100) NOT NULL,
    content       TEXT         NOT NULL,
    complaint_type ENUM('投诉','建议','咨询') NOT NULL DEFAULT '投诉',
    status        ENUM('待处理','处理中','已解决','已关闭') NOT NULL DEFAULT '待处理',
    reply         TEXT         COMMENT '处理回复',
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    resolved_at   TIMESTAMP    NULL,
    FOREIGN KEY (resident_id) REFERENCES residents(resident_id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='投诉建议';

-- 12. 公告通知表
CREATE TABLE announcements (
    announcement_id INT PRIMARY KEY AUTO_INCREMENT,
    title           VARCHAR(200) NOT NULL,
    content         TEXT         NOT NULL,
    ann_type        ENUM('通知','公告','活动','紧急') NOT NULL DEFAULT '通知',
    publisher       VARCHAR(50)  NOT NULL COMMENT '发布人',
    is_top          BOOLEAN      NOT NULL DEFAULT FALSE COMMENT '是否置顶',
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='公告通知';

-- 13. 访客登记表
CREATE TABLE visitor_records (
    visitor_id    INT PRIMARY KEY AUTO_INCREMENT,
    resident_id   INT          NOT NULL COMMENT '被访住户',
    visitor_name  VARCHAR(50)  NOT NULL,
    visitor_phone VARCHAR(20),
    purpose       ENUM('探访','快递','外卖','维修','商务','其他') NOT NULL DEFAULT '探访',
    entry_time    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    exit_time     TIMESTAMP    NULL,
    remark        VARCHAR(200),
    FOREIGN KEY (resident_id) REFERENCES residents(resident_id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='访客登记';


-- ================================================================
-- 二、触发器（共6个）
-- ================================================================

-- 触发器1：新增物业费记录时，自动根据计费方式计算金额
DELIMITER $$
CREATE TRIGGER trg_calc_fee_amount
BEFORE INSERT ON fee_records
FOR EACH ROW
BEGIN
    DECLARE v_calc_method VARCHAR(20);
    DECLARE v_unit_price DECIMAL(10,4);
    DECLARE v_room_area DECIMAL(10,2);

    -- 仅当金额为0时才自动计算（允许手动指定金额）
    IF NEW.amount = 0 THEN
        SELECT calc_method, unit_price INTO v_calc_method, v_unit_price
        FROM fee_categories WHERE category_id = NEW.category_id;

        IF v_calc_method = '按面积' THEN
            SELECT r.area INTO v_room_area
            FROM residents res
            JOIN rooms r ON res.room_id = r.room_id
            WHERE res.resident_id = NEW.resident_id;

            SET NEW.amount = ROUND(v_unit_price * v_room_area, 2);
        ELSEIF v_calc_method = '固定' THEN
            SET NEW.amount = v_unit_price;
        END IF;
        -- '按用量'的需要手动填写金额
    END IF;
END$$
DELIMITER ;

-- 触发器2：缴费后自动更新物业费状态
DELIMITER $$
CREATE TRIGGER trg_update_fee_status
AFTER UPDATE ON fee_records
FOR EACH ROW
BEGIN
    IF NEW.paid_amount >= NEW.amount AND NEW.paid_amount > 0 THEN
        UPDATE fee_records
        SET status = '已缴', paid_date = CURDATE()
        WHERE fee_id = NEW.fee_id;
    ELSEIF NEW.paid_amount > 0 AND NEW.paid_amount < NEW.amount THEN
        UPDATE fee_records
        SET status = '部分缴纳'
        WHERE fee_id = NEW.fee_id;
    END IF;
END$$
DELIMITER ;

-- 触发器3：报修工单状态改为"已完成"时，自动填充完成时间
DELIMITER $$
CREATE TRIGGER trg_repair_complete
BEFORE UPDATE ON repair_orders
FOR EACH ROW
BEGIN
    IF NEW.status = '已完成' AND OLD.status != '已完成' THEN
        SET NEW.completed_at = NOW();
    END IF;
END$$
DELIMITER ;

-- 触发器4：投诉状态改为"已解决"时，自动填充解决时间
DELIMITER $$
CREATE TRIGGER trg_complaint_resolve
BEFORE UPDATE ON complaints
FOR EACH ROW
BEGIN
    IF NEW.status = '已解决' AND OLD.status != '已解决' THEN
        SET NEW.resolved_at = NOW();
    END IF;
END$$
DELIMITER ;

-- 触发器5：新住户入住时，自动更新房屋状态为"已入住"
DELIMITER $$
CREATE TRIGGER trg_resident_movein
AFTER INSERT ON residents
FOR EACH ROW
BEGIN
    UPDATE rooms
    SET status = '已入住'
    WHERE room_id = NEW.room_id AND status != '已入住';
END$$
DELIMITER ;

-- 触发器6：工作人员离职时，将其负责的未完成工单重置为待处理
DELIMITER $$
CREATE TRIGGER trg_staff_resign
AFTER UPDATE ON staff
FOR EACH ROW
BEGIN
    IF NEW.status = '离职' AND OLD.status = '在职' THEN
        UPDATE repair_orders
        SET staff_id = NULL, status = '待处理'
        WHERE staff_id = OLD.staff_id AND status IN ('待处理', '处理中');
    END IF;
END$$
DELIMITER ;


-- ================================================================
-- 三、存储过程（共6个）
-- ================================================================

-- 存储过程1：批量生成指定月份所有入住住户的物业费账单
DELIMITER $$
CREATE PROCEDURE sp_generate_monthly_fees(
    IN p_period VARCHAR(20)  -- 格式: '2024-01'
)
BEGIN
    DECLARE v_done INT DEFAULT 0;
    DECLARE v_resident_id INT;
    DECLARE v_category_id INT;
    DECLARE v_amount DECIMAL(10,2);
    DECLARE v_room_area DECIMAL(10,2);
    DECLARE v_calc_method VARCHAR(20);
    DECLARE v_unit_price DECIMAL(10,4);
    DECLARE v_due_date DATE;

    -- 遍历所有入住住户
    DECLARE cur_resident CURSOR FOR
        SELECT res.resident_id, r.area
        FROM residents res
        JOIN rooms r ON res.room_id = r.room_id;

    -- 遍历所有费用类别
    DECLARE cur_category CURSOR FOR
        SELECT category_id, calc_method, unit_price
        FROM fee_categories;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

    -- 截止日期为当月25号
    SET v_due_date = STR_TO_DATE(CONCAT(p_period, '-25'), '%Y-%m-%d');

    OPEN cur_category;
    category_loop: LOOP
        FETCH cur_category INTO v_category_id, v_calc_method, v_unit_price;
        IF v_done THEN LEAVE category_loop; END IF;

        SET v_done = 0;
        OPEN cur_resident;
        resident_loop: LOOP
            FETCH cur_resident INTO v_resident_id, v_room_area;
            IF v_done THEN LEAVE resident_loop; END IF;

            -- 检查是否已存在该月该类别的账单，避免重复生成
            IF NOT EXISTS (
                SELECT 1 FROM fee_records
                WHERE resident_id = v_resident_id
                  AND category_id = v_category_id
                  AND fee_period = p_period
            ) THEN
                IF v_calc_method = '按面积' THEN
                    SET v_amount = ROUND(v_unit_price * v_room_area, 2);
                ELSEIF v_calc_method = '固定' THEN
                    SET v_amount = v_unit_price;
                ELSE
                    SET v_amount = 0; -- 按用量的需要手动录入
                END IF;

                INSERT INTO fee_records (resident_id, category_id, amount, fee_period, due_date)
                VALUES (v_resident_id, v_category_id, v_amount, p_period, v_due_date);
            END IF;
        END LOOP;
        CLOSE cur_resident;
        SET v_done = 0;
    END LOOP;
    CLOSE cur_category;

    SELECT CONCAT('已成功生成 ', p_period, ' 的物业费账单') AS result;
END$$
DELIMITER ;

-- 存储过程2：查询报修工单详细信息（多表联合查询）
DELIMITER $$
CREATE PROCEDURE sp_get_repair_detail(IN p_order_id INT)
BEGIN
    SELECT
        ro.order_id,
        ro.title,
        ro.description,
        ro.location,
        ro.priority,
        ro.status,
        ro.created_at,
        ro.completed_at,
        res.name AS resident_name,
        res.phone AS resident_phone,
        CONCAT(b.building_name, ' ', u.unit_number, ' ', r.room_number) AS full_address,
        s.name AS staff_name,
        s.phone AS staff_phone
    FROM repair_orders ro
    JOIN residents res ON ro.resident_id = res.resident_id
    JOIN rooms r ON res.room_id = r.room_id
    JOIN units u ON r.unit_id = u.unit_id
    JOIN buildings b ON u.building_id = b.building_id
    LEFT JOIN staff s ON ro.staff_id = s.staff_id
    WHERE ro.order_id = p_order_id;
END$$
DELIMITER ;

-- 存储过程3：查询车位使用情况统计
DELIMITER $$
CREATE PROCEDURE sp_parking_statistics()
BEGIN
    -- 总览统计
    SELECT
        COUNT(*) AS total_spaces,
        SUM(CASE WHEN status = '空闲' THEN 1 ELSE 0 END) AS available,
        SUM(CASE WHEN status = '已租' THEN 1 ELSE 0 END) AS rented,
        SUM(CASE WHEN status = '已售' THEN 1 ELSE 0 END) AS sold,
        SUM(CASE WHEN status = '维修中' THEN 1 ELSE 0 END) AS under_maintenance,
        CONCAT(
            ROUND(
                SUM(CASE WHEN status IN ('已租','已售') THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1
            ), '%'
        ) AS occupancy_rate
    FROM parking_spaces;

    -- 各区域统计
    SELECT
        area_name,
        COUNT(*) AS total,
        SUM(CASE WHEN status = '空闲' THEN 1 ELSE 0 END) AS available
    FROM parking_spaces
    GROUP BY area_name;
END$$
DELIMITER ;

-- 存储过程4：月度收费统计报表
DELIMITER $$
CREATE PROCEDURE sp_monthly_fee_report(IN p_period VARCHAR(20))
BEGIN
    -- 按费用类别统计
    SELECT
        fc.category_name,
        COUNT(fr.fee_id) AS total_bills,
        SUM(fr.amount) AS total_amount,
        SUM(fr.paid_amount) AS total_paid,
        SUM(fr.amount - fr.paid_amount) AS total_unpaid,
        SUM(CASE WHEN fr.status = '已缴' THEN 1 ELSE 0 END) AS paid_count,
        SUM(CASE WHEN fr.status = '逾期' THEN 1 ELSE 0 END) AS overdue_count,
        CONCAT(
            ROUND(
                SUM(CASE WHEN fr.status = '已缴' THEN 1 ELSE 0 END) * 100.0 / COUNT(fr.fee_id), 1
            ), '%'
        ) AS payment_rate
    FROM fee_records fr
    JOIN fee_categories fc ON fr.category_id = fc.category_id
    WHERE fr.fee_period = p_period
    GROUP BY fc.category_id, fc.category_name
    ORDER BY total_amount DESC;
END$$
DELIMITER ;

-- 存储过程5：住户物业费缴纳（支持部分缴纳）
DELIMITER $$
CREATE PROCEDURE sp_pay_fee(
    IN p_fee_id INT,
    IN p_pay_amount DECIMAL(10,2)
)
BEGIN
    DECLARE v_current_paid DECIMAL(10,2);
    DECLARE v_total_amount DECIMAL(10,2);
    DECLARE v_status VARCHAR(20);

    -- 获取当前缴费信息
    SELECT paid_amount, amount, status INTO v_current_paid, v_total_amount, v_status
    FROM fee_records WHERE fee_id = p_fee_id;

    IF v_status = '已缴' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '该笔费用已缴清，无需重复缴费';
    END IF;

    IF p_pay_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '缴费金额必须大于0';
    END IF;

    IF v_current_paid + p_pay_amount > v_total_amount THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '缴费金额超出应缴总额';
    END IF;

    -- 更新已缴金额（触发器会自动更新状态）
    UPDATE fee_records
    SET paid_amount = v_current_paid + p_pay_amount
    WHERE fee_id = p_fee_id;

    -- 返回更新后的记录
    SELECT
        fr.fee_id,
        fc.category_name,
        fr.amount,
        fr.paid_amount,
        (fr.amount - fr.paid_amount) AS remaining,
        fr.status,
        fr.fee_period
    FROM fee_records fr
    JOIN fee_categories fc ON fr.category_id = fc.category_id
    WHERE fr.fee_id = p_fee_id;
END$$
DELIMITER ;

-- 存储过程6：住户综合信息查询（多表聚合）
DELIMITER $$
CREATE PROCEDURE sp_resident_overview(IN p_resident_id INT)
BEGIN
    -- 基本信息
    SELECT
        res.resident_id, res.name, res.gender, res.phone, res.id_card,
        res.relationship, res.move_in_date,
        r.room_number, r.area, r.room_type,
        CONCAT(b.building_name, ' ', u.unit_number, ' ', r.room_number) AS full_address,
        (SELECT COUNT(*) FROM vehicles v WHERE v.resident_id = res.resident_id) AS vehicle_count,
        (SELECT COUNT(*) FROM repair_orders ro WHERE ro.resident_id = res.resident_id) AS repair_count,
        (SELECT COUNT(*) FROM complaints c WHERE c.resident_id = res.resident_id) AS complaint_count
    FROM residents res
    JOIN rooms r ON res.room_id = r.room_id
    JOIN units u ON r.unit_id = u.unit_id
    JOIN buildings b ON u.building_id = b.building_id
    WHERE res.resident_id = p_resident_id;

    -- 未缴费用
    SELECT
        fr.fee_id, fc.category_name, fr.amount, fr.paid_amount,
        (fr.amount - fr.paid_amount) AS remaining, fr.fee_period, fr.due_date
    FROM fee_records fr
    JOIN fee_categories fc ON fr.category_id = fc.category_id
    WHERE fr.resident_id = p_resident_id AND fr.status != '已缴'
    ORDER BY fr.due_date;

    -- 最近报修记录
    SELECT order_id, title, priority, status, created_at
    FROM repair_orders
    WHERE resident_id = p_resident_id
    ORDER BY created_at DESC LIMIT 5;
END$$
DELIMITER ;
