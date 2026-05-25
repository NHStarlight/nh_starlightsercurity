// file: delete_table.js
import { pool } from './src/config/db.js'; // Trỏ đúng đường dẫn đến file config db của bạn

async function dropTable() {
    try {
        await pool.query('DROP TABLE IF EXISTS "role-save" CASCADE');
        console.log("Đã xóa bảng 'role-save' thành công!");
        process.exit(0);
    } catch (err) {
        console.error("Lỗi khi xóa bảng:", err);
        process.exit(1);
    }
}

dropTable();
