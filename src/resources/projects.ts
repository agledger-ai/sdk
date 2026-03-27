/**
 * AGLedger™ SDK — Projects Resource
 * Patent Pending. Copyright 2026 AGLedger LLC. All rights reserved.
 */

import type { HttpClient } from '../http.js';
import type {
  Project,
  CreateProjectParams,
  UpdateProjectParams,
  Page,
  ListParams,
  RequestOptions,
} from '../types.js';

export class ProjectsResource {
  constructor(private readonly http: HttpClient) {}

  /** Create a new project for grouping related mandates. */
  async create(params: CreateProjectParams, options?: RequestOptions): Promise<Project> {
    return this.http.post<Project>('/v1/projects', params, options);
  }

  /** List projects. */
  async list(params?: ListParams, options?: RequestOptions): Promise<Page<Project>> {
    return this.http.getPage<Project>('/v1/projects', params as Record<string, unknown>, options);
  }

  /** Get a project by ID. */
  async get(projectId: string, options?: RequestOptions): Promise<Project> {
    return this.http.get<Project>(`/v1/projects/${projectId}`, undefined, options);
  }

  /** Update a project. */
  async update(projectId: string, params: UpdateProjectParams, options?: RequestOptions): Promise<Project> {
    return this.http.patch<Project>(`/v1/projects/${projectId}`, params, options);
  }

  /** Delete a project. */
  async delete(projectId: string, options?: RequestOptions): Promise<void> {
    return this.http.delete(`/v1/projects/${projectId}`, undefined, options);
  }
}
