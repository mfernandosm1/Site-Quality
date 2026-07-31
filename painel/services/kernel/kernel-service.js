import path from 'path';
import IdService from './id-service.js';
import LogService from './log-service.js';
import EventService from './event-service.js';
import AuditService from './audit-service.js';
import DocumentService from './document-service.js';
import TimelineService from './timeline-service.js';
import PermissionService from './permission-service.js';

export default class KernelService {
  constructor({ dataDir }) {
    this.dataDir = path.resolve(dataDir);
    this.ids = new IdService(path.join(this.dataDir, 'counters.json'));
    this.logs = new LogService({ file: path.join(this.dataDir, 'logs.json'), ids: this.ids });
    this.events = new EventService({ file: path.join(this.dataDir, 'events.json'), ids: this.ids });
    this.audits = new AuditService({ file: path.join(this.dataDir, 'audits.json'), ids: this.ids });
    this.documents = new DocumentService({ file: path.join(this.dataDir, 'documents.json'), ids: this.ids });
    this.timelines = new TimelineService({ file: path.join(this.dataDir, 'timelines.json'), ids: this.ids });
    this.permissions = new PermissionService({ file: path.join(this.dataDir, 'permissions.json') });
  }
  summary() {
    return {
      logs: this.logs.store.read().items.length, events: this.events.store.read().items.length,
      audits: this.audits.store.read().items.length, documents: this.documents.store.read().items.length,
      timelines: this.timelines.store.read().items.length, profiles: this.permissions.list().length
    };
  }
}
