/**
 * NMS WebSocket Server
 * Enables real-time communication between backend and frontend
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

class WebSocketServer extends EventEmitter {
  constructor(httpServer, options = {}) {
    super();

    this.wss = new WebSocket.Server({
      server: httpServer,
      path: options.path || '/ws',
      perMessageDeflate: options.perMessageDeflate || false
    });

    this.clients = new Map();
    this.subscriptions = new Map();
    this.messageQueue = [];
    this.maxQueueSize = options.maxQueueSize || 1000;

    this.setupWebSocketServer();
    console.log('🔌 WebSocket server initialized');
  }

  /**
   * Setup WebSocket server
   */
  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const clientInfo = {
        id: clientId,
        ws,
        connectedAt: new Date(),
        subscriptions: new Set(),
        lastHeartbeat: Date.now()
      };

      this.clients.set(clientId, clientInfo);
      console.log(`📱 Client connected: ${clientId}`);

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connection',
        message: 'Connected to NMS Server',
        clientId,
        timestamp: new Date()
      });

      // Setup message handler
      ws.on('message', (data) => {
        this.handleMessage(clientId, data);
      });

      // Setup error handler
      ws.on('error', (error) => {
        console.error(`❌ WebSocket error for ${clientId}:`, error.message);
        this.emit('clientError', { clientId, error });
      });

      // Setup close handler
      ws.on('close', () => {
        this.handleClientDisconnect(clientId);
      });

      // Setup ping/pong for heartbeat
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
        clientInfo.lastHeartbeat = Date.now();
      });

      this.emit('clientConnected', { clientId, timestamp: new Date() });
    });

    // Heartbeat check interval
    this.heartbeatInterval = setInterval(() => {
      for (const [clientId, clientInfo] of this.clients) {
        if (!clientInfo.ws.isAlive) {
          console.log(`💔 Terminating inactive client: ${clientId}`);
          clientInfo.ws.terminate();
        } else {
          clientInfo.ws.isAlive = false;
          clientInfo.ws.ping();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Handle incoming message
   */
  handleMessage(clientId, data) {
    try {
      const message = JSON.parse(data);
      console.log(`📨 Message from ${clientId}:`, message.type);

      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(clientId, message);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(clientId, message);
          break;
        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp: new Date() });
          break;
        case 'command':
          this.emit('command', { clientId, command: message });
          break;
        default:
          console.warn(`⚠️  Unknown message type: ${message.type}`);
      }

      this.emit('messageReceived', { clientId, message });
    } catch (error) {
      console.error(`❌ Error parsing message:`, error.message);
    }
  }

  /**
   * Handle client subscription
   */
  handleSubscribe(clientId, message) {
    const { channel } = message;
    if (!channel) return;

    const clientInfo = this.clients.get(clientId);
    if (!clientInfo) return;

    clientInfo.subscriptions.add(channel);

    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel).add(clientId);

    console.log(`📡 Client ${clientId} subscribed to ${channel}`);

    this.sendToClient(clientId, {
      type: 'subscribed',
      channel,
      timestamp: new Date()
    });
  }

  /**
   * Handle client unsubscribe
   */
  handleUnsubscribe(clientId, message) {
    const { channel } = message;
    if (!channel) return;

    const clientInfo = this.clients.get(clientId);
    if (!clientInfo) return;

    clientInfo.subscriptions.delete(channel);

    const channelSubscribers = this.subscriptions.get(channel);
    if (channelSubscribers) {
      channelSubscribers.delete(clientId);
    }

    console.log(`📴 Client ${clientId} unsubscribed from ${channel}`);

    this.sendToClient(clientId, {
      type: 'unsubscribed',
      channel,
      timestamp: new Date()
    });
  }

  /**
   * Handle client disconnect
   */
  handleClientDisconnect(clientId) {
    const clientInfo = this.clients.get(clientId);
    if (!clientInfo) return;

    // Remove from all subscriptions
    for (const [channel, subscribers] of this.subscriptions) {
      subscribers.delete(clientId);
    }

    this.clients.delete(clientId);
    console.log(`🔌 Client disconnected: ${clientId}`);

    this.emit('clientDisconnected', { clientId, timestamp: new Date() });
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId, message) {
    const clientInfo = this.clients.get(clientId);
    if (!clientInfo || clientInfo.ws.readyState !== WebSocket.OPEN) {
      console.warn(`⚠️  Client ${clientId} not available`);
      return false;
    }

    try {
      clientInfo.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`❌ Error sending to client ${clientId}:`, error.message);
      return false;
    }
  }

  /**
   * Broadcast message to channel subscribers
   */
  broadcastToChannel(channel, message) {
    const subscribers = this.subscriptions.get(channel) || new Set();
    let count = 0;

    for (const clientId of subscribers) {
      if (this.sendToClient(clientId, message)) {
        count++;
      }
    }

    console.log(`📢 Broadcast to ${channel}: ${count}/${subscribers.size} clients`);
    return count;
  }

  /**
   * Broadcast to all connected clients
   */
  broadcastAll(message) {
    let count = 0;

    for (const [clientId] of this.clients) {
      if (this.sendToClient(clientId, message)) {
        count++;
      }
    }

    console.log(`📢 Broadcast to all: ${count}/${this.clients.size} clients`);
    return count;
  }

  /**
   * Send device status update
   */
  sendDeviceUpdate(device) {
    const message = {
      type: 'deviceUpdate',
      deviceId: device.id,
      deviceName: device.name,
      status: device.connection_status,
      lastPolled: device.last_polled,
      metrics: device.metrics,
      timestamp: new Date()
    };

    this.broadcastToChannel('devices', message);
    this.queueMessage(message);
  }

  /**
   * Send alarm notification
   */
  sendAlarmNotification(alarm) {
    const message = {
      type: 'alarmCreated',
      alarmId: alarm.id,
      deviceId: alarm.device_id,
      deviceName: alarm.device_name,
      message: alarm.message,
      severity: alarm.severity,
      timestamp: alarm.created_at
    };

    this.broadcastToChannel('alarms', message);
    this.broadcastToChannel('dashboard', message);
    this.queueMessage(message);
  }

  /**
   * Send metrics update
   */
  sendMetricsUpdate(deviceId, metrics) {
    const message = {
      type: 'metricsUpdate',
      deviceId,
      metrics,
      timestamp: new Date()
    };

    this.broadcastToChannel(`device:${deviceId}`, message);
    this.broadcastToChannel('metrics', message);
    this.queueMessage(message);
  }

  /**
   * Queue message for offline clients
   */
  queueMessage(message) {
    this.messageQueue.push(message);
    if (this.messageQueue.length > this.maxQueueSize) {
      this.messageQueue.shift();
    }
  }

  /**
   * Send queued messages to client
   */
  sendQueuedMessages(clientId) {
    const recentMessages = this.messageQueue.slice(-10);
    for (const message of recentMessages) {
      this.sendToClient(clientId, message);
    }
  }

  /**
   * Get server statistics
   */
  getStatistics() {
    const stats = {
      connectedClients: this.clients.size,
      activeChannels: this.subscriptions.size,
      queuedMessages: this.messageQueue.length,
      channels: {}
    };

    for (const [channel, subscribers] of this.subscriptions) {
      stats.channels[channel] = subscribers.size;
    }

    return stats;
  }

  /**
   * Generate unique client ID
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Close WebSocket server
   */
  close() {
    console.log('🛑 Closing WebSocket server...');
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    for (const [, clientInfo] of this.clients) {
      clientInfo.ws.close();
    }

    this.wss.close();
    console.log('✅ WebSocket server closed');
  }

  /**
   * Get connected clients list
   */
  getClientsList() {
    const clients = [];
    for (const [clientId, clientInfo] of this.clients) {
      clients.push({
        id: clientId,
        connectedAt: clientInfo.connectedAt,
        lastHeartbeat: clientInfo.lastHeartbeat,
        subscriptions: Array.from(clientInfo.subscriptions)
      });
    }
    return clients;
  }
}

module.exports = WebSocketServer;
