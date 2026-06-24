// ======================== 工具函数 ========================
const API = '/api';
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const content = () => $('#content');

async function api(path, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  return res.json();
}

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = 'toast ' + (type === 'success' ? 'bg-green-500' : 'bg-red-500');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

function badge(text) {
  const map = { '已入住':'green','空置':'gray','装修中':'yellow','已缴':'green','待缴':'yellow','逾期':'red','部分缴纳':'purple',
    '待处理':'yellow','处理中':'blue','已完成':'green','已取消':'gray','已解决':'green','已关闭':'gray',
    '投诉':'red','建议':'blue','咨询':'gray','通知':'blue','公告':'green','活动':'purple','紧急':'red',
    '在职':'green','离职':'red','空闲':'green','已租':'blue','已售':'purple','维修中':'yellow',
    '低':'gray','中':'blue','高':'yellow','紧急':'red','业主':'blue','家属':'green','租客':'purple',
    '男':'blue','女':'purple','探访':'blue','快递':'green','外卖':'yellow','维修':'orange','商务':'purple','其他':'gray',
    '住宅':'blue','商铺':'green','储藏室':'gray','普通':'blue','大型':'purple','充电':'green',
    '轿车':'blue','SUV':'purple','电动车':'green','摩托车':'gray',
    '经理':'purple','维修工':'blue','保安':'green','保洁':'yellow',
    '固定':'gray','按面积':'blue','按用量':'green',
  };
  const cls = map[text] || 'gray';
  return `<span class="badge badge-${cls}">${text}</span>`;
}

function closeModal() { $('#modal').classList.add('hidden'); }
function openModal(title, bodyHtml, onSubmit) {
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = bodyHtml;
  $('#modal-submit').onclick = async () => {
    await onSubmit();
    closeModal();
  };
  $('#modal').classList.remove('hidden');
}

// 时间显示
function updateTime() {
  const now = new Date();
  $('#current-time').textContent = now.toLocaleString('zh-CN');
}
setInterval(updateTime, 1000);
updateTime();

// ======================== 导航 ========================
$$('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    $$('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    const page = item.dataset.page;
    $('#page-title').textContent = item.textContent.trim();
    loadPage(page);
  });
});

// ======================== 页面加载 ========================
async function loadPage(page) {
  const pages = {
    dashboard: renderDashboard, buildings: renderBuildings, rooms: renderRooms,
    residents: renderResidents, parking: renderParking, vehicles: renderVehicles,
    fees: renderFees, repairs: renderRepairs, complaints: renderComplaints,
    announcements: renderAnnouncements, visitors: renderVisitors, staff: renderStaff
  };
  if (pages[page]) await pages[page]();
}

// ======================== 控制台 ========================
async function renderDashboard() {
  const d = await api('/dashboard');
  content().innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="stat-card"><div class="stat-icon bg-blue-100 text-blue-600"><i class="ri-building-line"></i></div><div><div class="text-2xl font-bold">${d.buildings}</div><div class="text-sm text-gray-500">楼栋</div></div></div>
      <div class="stat-card"><div class="stat-icon bg-green-100 text-green-600"><i class="ri-home-4-line"></i></div><div><div class="text-2xl font-bold">${d.rooms.occupied}/${d.rooms.total}</div><div class="text-sm text-gray-500">已入住/总房屋</div></div></div>
      <div class="stat-card"><div class="stat-icon bg-purple-100 text-purple-600"><i class="ri-user-line"></i></div><div><div class="text-2xl font-bold">${d.residents}</div><div class="text-sm text-gray-500">住户人数</div></div></div>
      <div class="stat-card"><div class="stat-icon bg-yellow-100 text-yellow-600"><i class="ri-parking-box-line"></i></div><div><div class="text-2xl font-bold">${d.parking.available}/${d.parking.total}</div><div class="text-sm text-gray-500">空闲/总车位</div></div></div>
    </div>
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="stat-card"><div class="stat-icon bg-red-100 text-red-600"><i class="ri-tools-line"></i></div><div><div class="text-2xl font-bold">${d.repairs.pending}</div><div class="text-sm text-gray-500">待处理报修</div></div></div>
      <div class="stat-card"><div class="stat-icon bg-orange-100 text-orange-600"><i class="ri-chat-smile-line"></i></div><div><div class="text-2xl font-bold">${d.complaints.pending}</div><div class="text-sm text-gray-500">待处理投诉</div></div></div>
      <div class="stat-card"><div class="stat-icon bg-pink-100 text-pink-600"><i class="ri-money-cny-circle-line"></i></div><div><div class="text-2xl font-bold">${d.fees.unpaid}</div><div class="text-sm text-gray-500">未缴费用笔数</div></div></div>
    </div>
    <div class="card">
      <h3 class="font-semibold mb-3 text-gray-700"><i class="ri-megaphone-line mr-1"></i>最新公告</h3>
      <div class="space-y-2">
        ${d.announcements.map(a => `
          <div class="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
            ${badge(a.ann_type)}
            <div class="flex-1"><div class="font-medium text-sm">${a.is_top ? '<span class="text-red-500">[置顶]</span>' : ''}${a.title}</div><div class="text-xs text-gray-400 mt-1">${new Date(a.created_at).toLocaleString('zh-CN')} · ${a.publisher}</div></div>
          </div>
        `).join('')}
      </div>
    </div>`;
}

// ======================== 楼栋管理 ========================
async function renderBuildings() {
  const data = await api('/buildings');
  content().innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <span class="text-sm text-gray-500">共 ${data.length} 栋</span>
      <button class="btn btn-primary" onclick="addBuildingForm()"><i class="ri-add-line"></i>新增楼栋</button>
    </div>
    <div class="card overflow-x-auto">
      <table class="data-table">
        <tr><th>ID</th><th>楼栋名称</th><th>总楼层</th><th>地址</th><th>单元数</th><th>房屋数</th><th>操作</th></tr>
        ${data.map(r => `<tr>
          <td>${r.building_id}</td><td class="font-medium">${r.building_name}</td><td>${r.total_floors}</td>
          <td>${r.address || '-'}</td><td>${r.unit_count}</td><td>${r.room_count}</td>
          <td><button class="btn btn-sm btn-primary" onclick="editBuildingForm(${r.building_id},'${r.building_name}',${r.total_floors},'${r.address || ''}')">编辑</button> <button class="btn btn-sm btn-danger" onclick="delBuilding(${r.building_id})">删除</button></td>
        </tr>`).join('')}
      </table>
    </div>`;
}
function addBuildingForm() {
  openModal('新增楼栋', `
    <div class="form-group"><label>楼栋名称</label><input id="f-bname" placeholder="如：A栋"></div>
    <div class="form-group"><label>总楼层</label><input id="f-bfloors" type="number" placeholder="18"></div>
    <div class="form-group"><label>地址描述</label><input id="f-baddr" placeholder="小区东侧"></div>
  `, async () => {
    await api('/buildings', 'POST', { building_name: $('#f-bname').value, total_floors: +$('#f-bfloors').value, address: $('#f-baddr').value });
    toast('添加成功'); renderBuildings();
  });
}
function editBuildingForm(id, name, floors, addr) {
  openModal('编辑楼栋', `
    <div class="form-group"><label>楼栋名称</label><input id="f-bname" value="${name}"></div>
    <div class="form-group"><label>总楼层</label><input id="f-bfloors" type="number" value="${floors}"></div>
    <div class="form-group"><label>地址描述</label><input id="f-baddr" value="${addr}"></div>
  `, async () => {
    await api(`/buildings/${id}`, 'PUT', { building_name: $('#f-bname').value, total_floors: +$('#f-bfloors').value, address: $('#f-baddr').value });
    toast('更新成功'); renderBuildings();
  });
}
async function delBuilding(id) { if (!confirm('确认删除？')) return; await api(`/buildings/${id}`, 'DELETE'); toast('已删除'); renderBuildings(); }

// ======================== 房屋管理 ========================
async function renderRooms() {
  const data = await api('/rooms');
  content().innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <span class="text-sm text-gray-500">共 ${data.length} 间</span>
      <button class="btn btn-primary" onclick="addRoomForm()"><i class="ri-add-line"></i>新增房屋</button>
    </div>
    <div class="card overflow-x-auto">
      <table class="data-table">
        <tr><th>ID</th><th>完整地址</th><th>面积(m²)</th><th>类型</th><th>状态</th></tr>
        ${data.map(r => `<tr>
          <td>${r.room_id}</td><td class="font-medium">${r.full_address}</td><td>${r.area}</td>
          <td>${badge(r.room_type)}</td><td>${badge(r.status)}</td>
        </tr>`).join('')}
      </table>
    </div>`;
}
async function addRoomForm() {
  const units = await api('/units');
  openModal('新增房屋', `
    <div class="form-group"><label>所属单元</label><select id="f-unit">${units.map(u => `<option value="${u.unit_id}">${u.building_name} ${u.unit_number}</option>`).join('')}</select></div>
    <div class="form-group"><label>房间号</label><input id="f-rnum" placeholder="如：301"></div>
    <div class="form-group"><label>面积(m²)</label><input id="f-rarea" type="number" placeholder="89.5"></div>
    <div class="form-group"><label>类型</label><select id="f-rtype"><option>住宅</option><option>商铺</option><option>储藏室</option></select></div>
  `, async () => {
    await api('/rooms', 'POST', { unit_id: +$('#f-unit').value, room_number: $('#f-rnum').value, area: +$('#f-rarea').value, room_type: $('#f-rtype').value });
    toast('添加成功'); renderRooms();
  });
}

// ======================== 住户管理 ========================
async function renderResidents() {
  const data = await api('/residents');
  content().innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <span class="text-sm text-gray-500">共 ${data.length} 人</span>
      <button class="btn btn-primary" onclick="addResidentForm()"><i class="ri-add-line"></i>新增住户</button>
    </div>
    <div class="card overflow-x-auto">
      <table class="data-table">
        <tr><th>ID</th><th>姓名</th><th>性别</th><th>电话</th><th>地址</th><th>身份</th><th>入住日期</th><th>操作</th></tr>
        ${data.map(r => `<tr>
          <td>${r.resident_id}</td><td class="font-medium">${r.name}</td><td>${badge(r.gender)}</td>
          <td>${r.phone}</td><td>${r.full_address}</td><td>${badge(r.relationship)}</td>
          <td>${r.move_in_date}</td>
          <td><button class="btn btn-sm btn-primary" onclick="editResidentForm(${r.resident_id})">编辑</button> <button class="btn btn-sm btn-info" onclick="viewResident(${r.resident_id})">详情</button></td>
        </tr>`).join('')}
      </table>
    </div>`;
}
async function addResidentForm() {
  const rooms = await api('/rooms');
  openModal('新增住户', `
    <div class="form-group"><label>房屋</label><select id="f-room">${rooms.filter(r=>r.status==='空置').map(r => `<option value="${r.room_id}">${r.full_address} (${r.area}m²)</option>`).join('')}</select></div>
    <div class="form-group"><label>姓名</label><input id="f-rname"></div>
    <div class="form-group"><label>性别</label><select id="f-rgender"><option>男</option><option>女</option></select></div>
    <div class="form-group"><label>电话</label><input id="f-rphone"></div>
    <div class="form-group"><label>身份证号</label><input id="f-ridcard" maxlength="18"></div>
    <div class="form-group"><label>身份</label><select id="f-rrel"><option>业主</option><option>家属</option><option>租客</option></select></div>
    <div class="form-group"><label>入住日期</label><input id="f-rdate" type="date"></div>
  `, async () => {
    await api('/residents', 'POST', {
      room_id: +$('#f-room').value, name: $('#f-rname').value, gender: $('#f-rgender').value,
      phone: $('#f-rphone').value, id_card: $('#f-ridcard').value, relationship: $('#f-rrel').value, move_in_date: $('#f-rdate').value
    });
    toast('添加成功'); renderResidents();
  });
}
async function viewResident(id) {
  const d = await api(`/residents/${id}/overview`);
  const info = d.info || {};
  const fees = d.unpaid_fees || [];
  const repairs = d.recent_repairs || [];
  openModal('住户详情 - ' + info.name, `
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div><b>电话：</b>${info.phone}</div><div><b>性别：</b>${info.gender}</div>
        <div><b>身份：</b>${info.relationship}</div><div><b>入住：</b>${info.move_in_date}</div>
        <div class="col-span-2"><b>地址：</b>${info.full_address}</div>
        <div><b>面积：</b>${info.area}m²</div><div><b>车辆：</b>${info.vehicle_count}辆</div>
      </div>
      ${fees.length ? `<h4 class="font-semibold text-sm mt-3">未缴费用</h4><table class="data-table text-xs">
        <tr><th>类别</th><th>金额</th><th>已缴</th><th>周期</th></tr>
        ${fees.map(f => `<tr><td>${f.category_name}</td><td>${f.amount}</td><td>${f.paid_amount}</td><td>${f.fee_period}</td></tr>`).join('')}
      </table>` : ''}
      ${repairs.length ? `<h4 class="font-semibold text-sm mt-3">最近报修</h4><table class="data-table text-xs">
        <tr><th>标题</th><th>状态</th><th>时间</th></tr>
        ${repairs.map(r => `<tr><td>${r.title}</td><td>${badge(r.status)}</td><td>${new Date(r.created_at).toLocaleDateString()}</td></tr>`).join('')}
      </table>` : ''}
    </div>
  `, () => {});
  $('#modal-submit').textContent = '关闭';
}
async function editResidentForm(id) {
  const d = await api(`/residents/${id}/overview`);
  const info = d.info || {};
  const rooms = await api('/rooms');
  openModal('编辑住户', `
    <div class="form-group"><label>房屋</label><select id="f-room">${rooms.map(r => `<option value="${r.room_id}">${r.full_address} (${r.area}m²)</option>`).join('')}</select></div>
    <div class="form-group"><label>姓名</label><input id="f-rname" value="${info.name || ''}"></div>
    <div class="form-group"><label>性别</label><select id="f-rgender"><option ${info.gender==='男'?'selected':''}>男</option><option ${info.gender==='女'?'selected':''}>女</option></select></div>
    <div class="form-group"><label>电话</label><input id="f-rphone" value="${info.phone || ''}"></div>
    <div class="form-group"><label>身份证号</label><input id="f-ridcard" maxlength="18" value="${info.id_card || ''}"></div>
    <div class="form-group"><label>身份</label><select id="f-rrel"><option value="业主" ${info.relationship==='业主'?'selected':''}>业主</option><option value="家属" ${info.relationship==='家属'?'selected':''}>家属</option><option value="租客" ${info.relationship==='租客'?'selected':''}>租客</option></select></div>
    <div class="form-group"><label>入住日期</label><input id="f-rdate" type="date" value="${info.move_in_date || ''}"></div>
  `, async () => {
    await api(`/residents/${id}`, 'PUT', {
      room_id: +$('#f-room').value, name: $('#f-rname').value, gender: $('#f-rgender').value,
      phone: $('#f-rphone').value, id_card: $('#f-ridcard').value, relationship: $('#f-rrel').value, move_in_date: $('#f-rdate').value
    });
    toast('更新成功'); renderResidents();
  });
}

// ======================== 车位管理 ========================
async function renderParking() {
  const data = await api('/parking');
  const stats = await api('/parking/stats');
  const ov = stats.overview || {};
  content().innerHTML = `
    <div class="grid grid-cols-4 gap-4 mb-4">
      <div class="stat-card"><div class="text-2xl font-bold">${ov.total_spaces || 0}</div><div class="text-sm text-gray-500">总车位</div></div>
      <div class="stat-card"><div class="text-2xl font-bold text-green-600">${ov.available || 0}</div><div class="text-sm text-gray-500">空闲</div></div>
      <div class="stat-card"><div class="text-2xl font-bold text-blue-600">${ov.rented || 0}</div><div class="text-sm text-gray-500">已租</div></div>
      <div class="stat-card"><div class="text-2xl font-bold">${ov.occupancy_rate || '0%'}</div><div class="text-sm text-gray-500">使用率</div></div>
    </div>
    <div class="card overflow-x-auto">
      <table class="data-table">
        <tr><th>车位号</th><th>区域</th><th>类型</th><th>状态</th><th>月租价</th><th>车牌号</th><th>住户</th></tr>
        ${data.map(r => `<tr>
          <td class="font-medium">${r.space_number}</td><td>${r.area_name}</td><td>${badge(r.space_type)}</td>
          <td>${badge(r.status)}</td><td>¥${r.monthly_price}</td>
          <td>${r.plate_no || '-'}</td><td>${r.resident_name || '-'}</td>
        </tr>`).join('')}
      </table>
    </div>`;
}

// ======================== 车辆登记 ========================
async function renderVehicles() {
  const data = await api('/vehicles');
  content().innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <span class="text-sm text-gray-500">共 ${data.length} 辆</span>
      <button class="btn btn-primary" onclick="addVehicleForm()"><i class="ri-add-line"></i>登记车辆</button>
    </div>
    <div class="card overflow-x-auto">
      <table class="data-table">
        <tr><th>ID</th><th>车牌号</th><th>车辆类型</th><th>颜色</th><th>车主</th><th>绑定车位</th><th>操作</th></tr>
        ${data.map(r => `<tr>
          <td>${r.vehicle_id}</td><td class="font-medium">${r.plate_no}</td><td>${badge(r.vehicle_type)}</td>
          <td>${r.color || '-'}</td><td>${r.resident_name}</td><td>${r.space_number || '未绑定'}</td>
          <td><button class="btn btn-sm btn-primary" onclick="editVehicleForm(${r.vehicle_id})">编辑</button></td>
        </tr>`).join('')}
      </table>
    </div>`;
}
async function addVehicleForm() {
  const residents = await api('/residents');
  openModal('车辆登记', `
    <div class="form-group"><label>车主</label><select id="f-vres">${residents.map(r => `<option value="${r.resident_id}">${r.name} (${r.full_address})</option>`).join('')}</select></div>
    <div class="form-group"><label>车牌号</label><input id="f-vplate" placeholder="京A12345"></div>
    <div class="form-group"><label>车辆类型</label><select id="f-vtype"><option>轿车</option><option>SUV</option><option>电动车</option><option>摩托车</option></select></div>
    <div class="form-group"><label>颜色</label><input id="f-vcolor" placeholder="白色"></div>
  `, async () => {
    await api('/vehicles', 'POST', { resident_id: +$('#f-vres').value, plate_no: $('#f-vplate').value, vehicle_type: $('#f-vtype').value, color: $('#f-vcolor').value });
    toast('登记成功'); renderVehicles();
  });
}
function editVehicleForm(id) {
  const cars = vehicleCache ? vehicleCache : null;
  api('/vehicles').then(all => {
    const v = all.find(x => x.vehicle_id === id);
    if (!v) return;
    api('/residents').then(residents => {
      openModal('编辑车辆', `
        <div class="form-group"><label>车主</label><select id="f-vres">${residents.map(r => `<option value="${r.resident_id}" ${r.resident_id===v.resident_id?'selected':''}>${r.name} (${r.full_address})</option>`).join('')}</select></div>
        <div class="form-group"><label>车牌号</label><input id="f-vplate" value="${v.plate_no}"></div>
        <div class="form-group"><label>车辆类型</label><select id="f-vtype"><option ${v.vehicle_type==='轿车'?'selected':''}>轿车</option><option ${v.vehicle_type==='SUV'?'selected':''}>SUV</option><option ${v.vehicle_type==='电动车'?'selected':''}>电动车</option><option ${v.vehicle_type==='摩托车'?'selected':''}>摩托车</option></select></div>
        <div class="form-group"><label>颜色</label><input id="f-vcolor" value="${v.color || ''}"></div>
      `, async () => {
        await api(`/vehicles/${id}`, 'PUT', { resident_id: +$('#f-vres').value, plate_no: $('#f-vplate').value, vehicle_type: $('#f-vtype').value, color: $('#f-vcolor').value });
        toast('更新成功'); renderVehicles();
      });
    });
  });
}

// ======================== 物业费管理 ========================
async function renderFees() {
  const data = await api('/fees');
  const periods = [...new Set(data.map(r => r.fee_period))].sort().reverse();
  content().innerHTML = `
    <div class="flex justify-between items-center mb-4 gap-3">
      <div class="flex gap-2 items-center">
        <span class="text-sm text-gray-500">共 ${data.length} 条</span>
        <select id="fee-filter" class="text-sm border rounded px-2 py-1" onchange="filterFees()">
          <option value="">全部月份</option>
          ${periods.map(p => `<option value="${p}">${p}</option>`).join('')}
        </select>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-success" onclick="generateFees()"><i class="ri-file-add-line"></i>生成月度账单</button>
        <button class="btn btn-primary" onclick="viewFeeReport()"><i class="ri-bar-chart-line"></i>月度报表</button>
      </div>
    </div>
    <div class="card overflow-x-auto">
      <table class="data-table">
        <tr><th>ID</th><th>住户</th><th>地址</th><th>费用类别</th><th>应缴</th><th>已缴</th><th>周期</th><th>状态</th><th>操作</th></tr>
        <tbody id="fee-table">
        ${data.map(r => `<tr data-period="${r.fee_period}">
          <td>${r.fee_id}</td><td>${r.resident_name}</td><td class="text-xs">${r.full_address}</td>
          <td>${r.category_name}</td><td>¥${r.amount}</td><td>¥${r.paid_amount}</td>
          <td>${r.fee_period}</td><td>${badge(r.status)}</td>
          <td>${r.status !== '已缴' ? `<button class="btn btn-sm btn-success" onclick="payFee(${r.fee_id},${r.amount - r.paid_amount})">缴费</button>` : '-'}</td>
        </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}
function filterFees() {
  const val = $('#fee-filter').value;
  $$('#fee-table tr').forEach(tr => {
    tr.style.display = !val || tr.dataset.period === val ? '' : 'none';
  });
}
function payFee(id, remaining) {
  openModal('物业费缴纳', `
    <div class="form-group"><label>缴费金额 (待缴: ¥${remaining})</label><input id="f-payamount" type="number" step="0.01" value="${remaining}" max="${remaining}"></div>
  `, async () => {
    const amt = parseFloat($('#f-payamount').value);
    if (amt <= 0 || amt > remaining) { toast('金额无效', 'error'); return; }
    await api('/fees/pay', 'POST', { fee_id: id, amount: amt });
    toast('缴费成功'); renderFees();
  });
}
function generateFees() {
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  openModal('生成月度账单', `
    <div class="form-group"><label>账单月份</label><input id="f-period" value="${period}" placeholder="2026-07"></div>
    <p class="text-sm text-gray-500">将为所有入住住户批量生成本月物业费账单</p>
  `, async () => {
    await api('/fees/generate', 'POST', { period: $('#f-period').value });
    toast('账单生成成功'); renderFees();
  });
}
async function viewFeeReport() {
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const data = await api(`/fees/report/${period}`);
  openModal(`${period} 收费报表`, `
    <table class="data-table">
      <tr><th>费用类别</th><th>账单数</th><th>应缴总额</th><th>已缴总额</th><th>未缴总额</th><th>缴费率</th></tr>
      ${data.map(r => `<tr>
        <td class="font-medium">${r.category_name}</td><td>${r.total_bills}</td>
        <td>¥${r.total_amount}</td><td>¥${r.total_paid}</td><td>¥${r.total_unpaid}</td>
        <td class="font-medium">${r.payment_rate}</td>
      </tr>`).join('')}
    </table>
  `, () => {});
  $('#modal-submit').textContent = '关闭';
}

// ======================== 报修工单 ========================
async function renderRepairs() {
  const data = await api('/repairs');
  const staffList = await api('/staff');
  const repairStaff = staffList.filter(s => s.role === '维修工' && s.status === '在职');
  content().innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <span class="text-sm text-gray-500">共 ${data.length} 条</span>
      <button class="btn btn-primary" onclick="addRepairForm()"><i class="ri-add-line"></i>新建工单</button>
    </div>
    <div class="card overflow-x-auto">
      <table class="data-table">
        <tr><th>ID</th><th>标题</th><th>住户</th><th>地址</th><th>优先级</th><th>状态</th><th>维修人员</th><th>时间</th><th>操作</th></tr>
        ${data.map(r => `<tr>
          <td>${r.order_id}</td><td class="font-medium">${r.title}</td><td>${r.resident_name}</td>
          <td class="text-xs">${r.full_address}</td><td>${badge(r.priority)}</td><td>${badge(r.status)}</td>
          <td>${r.staff_name || '-'}</td><td class="text-xs">${new Date(r.created_at).toLocaleDateString()}</td>
          <td class="flex gap-1">
            ${r.status !== '已完成' && r.status !== '已取消' ? `
              <select class="text-xs border rounded px-1 py-0.5" onchange="assignRepair(${r.order_id}, this.value)">
                <option value="">指派人员</option>
                ${repairStaff.map(s => `<option value="${s.staff_id}" ${r.staff_id==s.staff_id?'selected':''}>${s.name}</option>`).join('')}
              </select>
              <button class="btn btn-sm btn-success" onclick="completeRepair(${r.order_id})">完成</button>
            ` : ''}
          </td>
        </tr>`).join('')}
      </table>
    </div>`;
}
async function addRepairForm() {
  const residents = await api('/residents');
  openModal('新建报修工单', `
    <div class="form-group"><label>报修住户</label><select id="f-rpres">${residents.map(r => `<option value="${r.resident_id}">${r.name} (${r.full_address})</option>`).join('')}</select></div>
    <div class="form-group"><label>报修标题</label><input id="f-rptitle" placeholder="如：厨房水管漏水"></div>
    <div class="form-group"><label>问题描述</label><textarea id="f-rpdesc" rows="3"></textarea></div>
    <div class="form-group"><label>位置</label><input id="f-rploc" placeholder="A栋1单元101厨房"></div>
    <div class="form-group"><label>优先级</label><select id="f-rppri"><option>低</option><option selected>中</option><option>高</option><option>紧急</option></select></div>
  `, async () => {
    await api('/repairs', 'POST', {
      resident_id: +$('#f-rpres').value, title: $('#f-rptitle').value, description: $('#f-rpdesc').value,
      location: $('#f-rploc').value, priority: $('#f-rppri').value
    });
    toast('提交成功'); renderRepairs();
  });
}
async function assignRepair(id, staffId) {
  await api(`/repairs/${id}`, 'PUT', { staff_id: staffId || null, status: staffId ? '处理中' : '待处理' });
  toast('已更新');
}
async function completeRepair(id) {
  await api(`/repairs/${id}`, 'PUT', { status: '已完成' });
  toast('已标记完成'); renderRepairs();
}

// ======================== 投诉建议 ========================
async function renderComplaints() {
  const data = await api('/complaints');
  content().innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <span class="text-sm text-gray-500">共 ${data.length} 条</span>
      <button class="btn btn-primary" onclick="addComplaintForm()"><i class="ri-add-line"></i>新增</button>
    </div>
    <div class="card overflow-x-auto">
      <table class="data-table">
        <tr><th>ID</th><th>类型</th><th>标题</th><th>住户</th><th>状态</th><th>回复</th><th>时间</th><th>操作</th></tr>
        ${data.map(c => `<tr>
          <td>${c.complaint_id}</td><td>${badge(c.complaint_type)}</td><td class="font-medium">${c.title}</td>
          <td>${c.resident_name}</td><td>${badge(c.status)}</td>
          <td class="max-w-[200px] truncate text-xs">${c.reply || '-'}</td>
          <td class="text-xs">${new Date(c.created_at).toLocaleDateString()}</td>
          <td>${c.status !== '已解决' && c.status !== '已关闭' ? `<button class="btn btn-sm btn-success" onclick="resolveComplaint(${c.complaint_id})">解决</button>` : ''}</td>
        </tr>`).join('')}
      </table>
    </div>`;
}
async function addComplaintForm() {
  const residents = await api('/residents');
  openModal('新增投诉/建议', `
    <div class="form-group"><label>住户</label><select id="f-cres">${residents.map(r => `<option value="${r.resident_id}">${r.name}</option>`).join('')}</select></div>
    <div class="form-group"><label>类型</label><select id="f-ctype"><option>投诉</option><option>建议</option><option>咨询</option></select></div>
    <div class="form-group"><label>标题</label><input id="f-ctitle"></div>
    <div class="form-group"><label>内容</label><textarea id="f-ccontent" rows="3"></textarea></div>
  `, async () => {
    await api('/complaints', 'POST', {
      resident_id: +$('#f-cres').value, complaint_type: $('#f-ctype').value, title: $('#f-ctitle').value, content: $('#f-ccontent').value
    });
    toast('提交成功'); renderComplaints();
  });
}
function resolveComplaint(id) {
  openModal('处理投诉', `
    <div class="form-group"><label>处理回复</label><textarea id="f-creply" rows="3" placeholder="请填写处理结果"></textarea></div>
  `, async () => {
    await api(`/complaints/${id}`, 'PUT', { status: '已解决', reply: $('#f-creply').value });
    toast('已解决'); renderComplaints();
  });
}

// ======================== 公告管理 ========================
async function renderAnnouncements() {
  const data = await api('/announcements');
  content().innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <span class="text-sm text-gray-500">共 ${data.length} 条</span>
      <button class="btn btn-primary" onclick="addAnnouncementForm()"><i class="ri-add-line"></i>发布公告</button>
    </div>
    <div class="space-y-3">
      ${data.map(a => `
        <div class="card">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-2">
              ${badge(a.ann_type)}
              ${a.is_top ? '<span class="badge badge-red">置顶</span>' : ''}
              <span class="font-semibold">${a.title}</span>
            </div>
            <div>
              <button class="btn btn-sm btn-primary" onclick="editAnnouncementForm(${a.announcement_id})">编辑</button>
              <button class="btn btn-sm btn-danger" onclick="delAnnouncement(${a.announcement_id})">删除</button>
            </div>
          </div>
          <p class="text-sm text-gray-600 mt-2 leading-relaxed">${a.content}</p>
          <div class="text-xs text-gray-400 mt-2">${new Date(a.created_at).toLocaleString('zh-CN')} · ${a.publisher}</div>
        </div>
      `).join('')}
    </div>`;
}
function addAnnouncementForm() {
  openModal('发布公告', `
    <div class="form-group"><label>标题</label><input id="f-atitle"></div>
    <div class="form-group"><label>内容</label><textarea id="f-acontent" rows="4"></textarea></div>
    <div class="form-group"><label>类型</label><select id="f-atype"><option>通知</option><option>公告</option><option>活动</option><option>紧急</option></select></div>
    <div class="form-group"><label>发布人</label><input id="f-apub" value="物业服务中心"></div>
    <div class="form-group"><label><input type="checkbox" id="f-atop"> 置顶</label></div>
  `, async () => {
    await api('/announcements', 'POST', {
      title: $('#f-atitle').value, content: $('#f-acontent').value, ann_type: $('#f-atype').value,
      publisher: $('#f-apub').value, is_top: $('#f-atop').checked
    });
    toast('发布成功'); renderAnnouncements();
  });
}
async function delAnnouncement(id) { if (!confirm('确认删除？')) return; await api(`/announcements/${id}`, 'DELETE'); toast('已删除'); renderAnnouncements(); }
async function editAnnouncementForm(id) {
  const all = await api('/announcements');
  const a = all.find(x => x.announcement_id === id);
  if (!a) return;
  openModal('编辑公告', `
    <div class="form-group"><label>标题</label><input id="f-atitle" value="${a.title.replace(/"/g,'&quot;')}"></div>
    <div class="form-group"><label>内容</label><textarea id="f-acontent" rows="4">${a.content}</textarea></div>
    <div class="form-group"><label>类型</label><select id="f-atype"><option ${a.ann_type==='通知'?'selected':''}>通知</option><option ${a.ann_type==='公告'?'selected':''}>公告</option><option ${a.ann_type==='活动'?'selected':''}>活动</option><option ${a.ann_type==='紧急'?'selected':''}>紧急</option></select></div>
    <div class="form-group"><label>发布人</label><input id="f-apub" value="${a.publisher}"></div>
    <div class="form-group"><label><input type="checkbox" id="f-atop" ${a.is_top?'checked':''}> 置顶</label></div>
  `, async () => {
    await api(`/announcements/${id}`, 'PUT', {
      title: $('#f-atitle').value, content: $('#f-acontent').value, ann_type: $('#f-atype').value,
      publisher: $('#f-apub').value, is_top: $('#f-atop').checked
    });
    toast('更新成功'); renderAnnouncements();
  });
}

// ======================== 访客登记 ========================
async function renderVisitors() {
  const data = await api('/visitors');
  content().innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <span class="text-sm text-gray-500">共 ${data.length} 条</span>
      <button class="btn btn-primary" onclick="addVisitorForm()"><i class="ri-add-line"></i>登记访客</button>
    </div>
    <div class="card overflow-x-auto">
      <table class="data-table">
        <tr><th>ID</th><th>访客姓名</th><th>电话</th><th>来访目的</th><th>被访住户</th><th>地址</th><th>进入时间</th><th>离开时间</th><th>操作</th></tr>
        ${data.map(v => `<tr>
          <td>${v.visitor_id}</td><td class="font-medium">${v.visitor_name}</td><td>${v.visitor_phone || '-'}</td>
          <td>${badge(v.purpose)}</td><td>${v.resident_name}</td><td class="text-xs">${v.full_address}</td>
          <td class="text-xs">${new Date(v.entry_time).toLocaleString('zh-CN')}</td>
          <td class="text-xs">${v.exit_time ? new Date(v.exit_time).toLocaleString('zh-CN') : '<span class="text-orange-500">未离开</span>'}</td>
          <td>${!v.exit_time ? `<button class="btn btn-sm btn-success" onclick="visitorExit(${v.visitor_id})">登记离开</button>` : ''}</td>
        </tr>`).join('')}
      </table>
    </div>`;
}
async function addVisitorForm() {
  const residents = await api('/residents');
  openModal('访客登记', `
    <div class="form-group"><label>访客姓名</label><input id="f-vname"></div>
    <div class="form-group"><label>访客电话</label><input id="f-vphone"></div>
    <div class="form-group"><label>来访目的</label><select id="f-vpurpose"><option>探访</option><option>快递</option><option>外卖</option><option>维修</option><option>商务</option><option>其他</option></select></div>
    <div class="form-group"><label>被访住户</label><select id="f-vhost">${residents.map(r => `<option value="${r.resident_id}">${r.name} (${r.full_address})</option>`).join('')}</select></div>
    <div class="form-group"><label>备注</label><input id="f-vremark"></div>
  `, async () => {
    await api('/visitors', 'POST', {
      resident_id: +$('#f-vhost').value, visitor_name: $('#f-vname').value, visitor_phone: $('#f-vphone').value,
      purpose: $('#f-vpurpose').value, remark: $('#f-vremark').value
    });
    toast('登记成功'); renderVisitors();
  });
}
async function visitorExit(id) { await api(`/visitors/${id}/exit`, 'PUT'); toast('已登记离开'); renderVisitors(); }

// ======================== 工作人员 ========================
async function renderStaff() {
  const data = await api('/staff');
  content().innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <span class="text-sm text-gray-500">共 ${data.length} 人</span>
      <button class="btn btn-primary" onclick="addStaffForm()"><i class="ri-add-line"></i>新增员工</button>
    </div>
    <div class="card overflow-x-auto">
      <table class="data-table">
        <tr><th>ID</th><th>姓名</th><th>性别</th><th>电话</th><th>岗位</th><th>薪资</th><th>入职日期</th><th>状态</th><th>操作</th></tr>
        ${data.map(s => `<tr>
          <td>${s.staff_id}</td><td class="font-medium">${s.name}</td><td>${badge(s.gender)}</td>
          <td>${s.phone}</td><td>${badge(s.role)}</td><td>¥${s.salary}</td>
          <td>${s.hire_date}</td><td>${badge(s.status)}</td>
          <td><button class="btn btn-sm btn-primary" onclick="editStaffForm(${s.staff_id})">编辑</button> ${s.status === '在职' ? `<button class="btn btn-sm btn-danger" onclick="resignStaff(${s.staff_id})">离职</button>` : ''}</td>
        </tr>`).join('')}
      </table>
    </div>`;
}
function addStaffForm() {
  openModal('新增员工', `
    <div class="form-group"><label>姓名</label><input id="f-sname"></div>
    <div class="form-group"><label>性别</label><select id="f-sgender"><option>男</option><option>女</option></select></div>
    <div class="form-group"><label>电话</label><input id="f-sphone"></div>
    <div class="form-group"><label>岗位</label><select id="f-srole"><option>经理</option><option>维修工</option><option>保安</option><option>保洁</option></select></div>
    <div class="form-group"><label>薪资</label><input id="f-ssalary" type="number" value="4000"></div>
    <div class="form-group"><label>入职日期</label><input id="f-sdate" type="date"></div>
  `, async () => {
    await api('/staff', 'POST', {
      name: $('#f-sname').value, gender: $('#f-sgender').value, phone: $('#f-sphone').value,
      role: $('#f-srole').value, salary: +$('#f-ssalary').value, hire_date: $('#f-sdate').value
    });
    toast('添加成功'); renderStaff();
  });
}
async function resignStaff(id) { if (!confirm('确认办理离职？')) return; await api(`/staff/${id}`, 'PUT', { status: '离职' }); toast('已更新'); renderStaff(); }
async function editStaffForm(id) {
  const all = await api('/staff');
  const s = all.find(x => x.staff_id === id);
  if (!s) return;
  openModal('编辑员工', `
    <div class="form-group"><label>姓名</label><input id="f-sname" value="${s.name}"></div>
    <div class="form-group"><label>性别</label><select id="f-sgender"><option ${s.gender==='男'?'selected':''}>男</option><option ${s.gender==='女'?'selected':''}>女</option></select></div>
    <div class="form-group"><label>电话</label><input id="f-sphone" value="${s.phone}"></div>
    <div class="form-group"><label>岗位</label><select id="f-srole"><option ${s.role==='经理'?'selected':''}>经理</option><option ${s.role==='维修工'?'selected':''}>维修工</option><option ${s.role==='保安'?'selected':''}>保安</option><option ${s.role==='保洁'?'selected':''}>保洁</option></select></div>
    <div class="form-group"><label>薪资</label><input id="f-ssalary" type="number" value="${s.salary}"></div>
    <div class="form-group"><label>状态</label><select id="f-sstatus"><option value="在职" ${s.status==='在职'?'selected':''}>在职</option><option value="离职" ${s.status==='离职'?'selected':''}>离职</option></select></div>
  `, async () => {
    await api(`/staff/${id}`, 'PUT', { name: $('#f-sname').value, gender: $('#f-sgender').value, phone: $('#f-sphone').value, role: $('#f-srole').value, salary: +$('#f-ssalary').value, status: $('#f-sstatus').value });
    toast('更新成功'); renderStaff();
  });
}

// ======================== 初始化 ========================
loadPage('dashboard');
