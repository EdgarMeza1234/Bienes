const express = require('express');
const router = express.Router();

router.get('/stock', (req, res) => {
  try {
    const byStatus = req.db.prepare(`
      SELECT status, COUNT(*) as count FROM equipos WHERE status != 'baja' GROUP BY status ORDER BY count DESC
    `).all();

    const byModel = req.db.prepare(`
      SELECT COALESCE(m.name, e.model_text, 'Sin modelo') as model_name, COUNT(*) as count
      FROM equipos e LEFT JOIN ont_models m ON e.model_id = m.id
      WHERE e.status != 'baja'
      GROUP BY e.model_id ORDER BY count DESC
    `).all();

    const byZone = req.db.prepare(`
      SELECT COALESCE(u.zone_text, 'Sin zona') as zone_name, COUNT(*) as count
      FROM equipos e LEFT JOIN usuarios u ON e.usuario_id = u.id
      WHERE e.status != 'baja'
      GROUP BY u.zone_text ORDER BY count DESC
    `).all();

    const total = req.db.prepare("SELECT COUNT(*) as count FROM equipos WHERE status != 'baja'").get();
    const disponible = req.db.prepare("SELECT COUNT(*) as count FROM equipos WHERE status = 'disponible'").get();
    const despachada = req.db.prepare("SELECT COUNT(*) as count FROM equipos WHERE status = 'despachada'").get();
    const instalada = req.db.prepare("SELECT COUNT(*) as count FROM equipos WHERE status = 'instalada'").get();
    const devuelta_cp = req.db.prepare("SELECT COUNT(*) as count FROM equipos WHERE status = 'devuelta_cambio_plan'").get();
    const devuelta_d = req.db.prepare("SELECT COUNT(*) as count FROM equipos WHERE status = 'devuelta_defecto'").get();
    const devuelta_ce = req.db.prepare("SELECT COUNT(*) as count FROM equipos WHERE status = 'devuelta_cambio_equipo'").get();
    const vendida = req.db.prepare("SELECT COUNT(*) as count FROM equipos WHERE status = 'vendida'").get();
    const baja = req.db.prepare("SELECT COUNT(*) as count FROM equipos WHERE status = 'baja'").get();

    res.json({
      summary: {
        total: total.count, disponible: disponible.count, despachada: despachada.count,
        instalada: instalada.count, devuelta_cambio_plan: devuelta_cp.count,
        devuelta_defecto: devuelta_d.count, devuelta_cambio_equipo: devuelta_ce.count,
        vendida: vendida.count, baja: baja.count
      },
      byStatus, byModel, byZone
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/kardex-tecnico', (req, res) => {
  try {
    const technicians = req.db.prepare(`
      SELECT t.id, t.name,
        (SELECT COUNT(*) FROM equipos WHERE technician_id = t.id AND status = 'despachada') as despachadas,
        (SELECT COUNT(*) FROM equipos WHERE technician_id = t.id AND status = 'instalada') as instaladas,
        (SELECT COUNT(*) FROM equipos WHERE technician_id = t.id AND status = 'despachada') as pendientes,
        (SELECT COUNT(*) FROM equipos WHERE technician_id = t.id AND status LIKE 'devuelta%') as devueltas
      FROM technicians t
      WHERE t.active = 1
      ORDER BY despachadas DESC, pendientes DESC
    `).all();
    res.json(technicians);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/devoluciones', (req, res) => {
  try {
    const byType = req.db.prepare(`SELECT return_type, COUNT(*) as count FROM devoluciones GROUP BY return_type`).all();
    const byMonth = req.db.prepare(`
      SELECT substr(return_date, 1, 7) as month, COUNT(*) as count
      FROM devoluciones GROUP BY substr(return_date, 1, 7) ORDER BY month DESC LIMIT 12
    `).all();
    res.json({ byType, byMonth });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
