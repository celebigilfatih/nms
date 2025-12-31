/**
 * Node.js Backend API Integration Examples
 * 
 * These endpoints should be implemented in your Node.js/Express backend
 * to receive alarms and metrics from the Python NMS service.
 */

// Example Express.js endpoints for NMS integration

// POST /api/alarms - Create alarm
app.post('/api/alarms', async (req, res) => {
  try {
    const { device_id, device_name, type, severity, message, metadata } = req.body;
    
    // Validate input
    if (!device_id || !type || !severity || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Store alarm in database
    const alarm = await Alarm.create({
      device_id,
      device_name,
      type,
      severity,
      message,
      metadata,
      created_at: new Date(),
      resolved: false,
    });
    
    // Optional: Send notifications (email, Slack, etc.)
    await notifyUsers(alarm);
    
    // Optional: Broadcast to connected clients via WebSocket
    io.emit('alarm:new', alarm);
    
    res.status(201).json(alarm);
  } catch (error) {
    console.error('Failed to create alarm:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/alarms - Get alarms with filters
app.get('/api/alarms', async (req, res) => {
  try {
    const { device_id, severity, resolved, limit = 100 } = req.query;
    
    let query = {};
    if (device_id) query.device_id = device_id;
    if (severity) query.severity = severity;
    if (resolved !== undefined) query.resolved = resolved === 'true';
    
    const alarms = await Alarm.find(query)
      .sort({ created_at: -1 })
      .limit(parseInt(limit));
    
    res.json(alarms);
  } catch (error) {
    console.error('Failed to fetch alarms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/alarms/:id/acknowledge - Acknowledge alarm
app.patch('/api/alarms/:id/acknowledge', async (req, res) => {
  try {
    const { acknowledged_by = 'api' } = req.body;
    
    const alarm = await Alarm.findByIdAndUpdate(
      req.params.id,
      {
        acknowledged: true,
        acknowledged_at: new Date(),
        acknowledged_by,
      },
      { new: true }
    );
    
    if (!alarm) {
      return res.status(404).json({ error: 'Alarm not found' });
    }
    
    // Broadcast update
    io.emit('alarm:acknowledged', alarm);
    
    res.json(alarm);
  } catch (error) {
    console.error('Failed to acknowledge alarm:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/metrics - Receive metrics from NMS
app.post('/api/metrics', async (req, res) => {
  try {
    const { device_id, type, data, timestamp } = req.body;
    
    if (!device_id || !type || !data) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Store metrics based on type
    let metric;
    
    if (type === 'interface') {
      metric = await InterfaceMetric.create({
        device_id,
        ...data,
        collected_at: new Date(timestamp),
      });
    } else if (type === 'health') {
      metric = await DeviceHealthMetric.create({
        device_id,
        ...data,
        collected_at: new Date(timestamp),
      });
    } else if (type === 'inventory') {
      metric = await DeviceInventory.create({
        device_id,
        ...data,
        collected_at: new Date(timestamp),
      });
    }
    
    // Update device last_seen timestamp
    await Device.findByIdAndUpdate(device_id, {
      last_seen: new Date(),
    });
    
    // Broadcast to connected dashboards
    io.emit('metric:update', { device_id, type, data });
    
    res.status(201).json({ success: true, metric_id: metric._id });
  } catch (error) {
    console.error('Failed to store metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/health - Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});
