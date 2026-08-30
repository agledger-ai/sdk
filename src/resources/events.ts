import type { HttpClient } from '../http.js';
import type {
  AgledgerEvent,
  Page,
  ListEventsParams,
  RequestOptions,
  AutoPaginateOptions,
} from '../types.js';

export class EventsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List events globally. `since` is required and inclusive; pair it with
   * `until` to close the window so consecutive polls compose without overlap.
   * GET /v1/events?since=...&until=...&order=asc|desc
   */
  list(params: ListEventsParams, options?: RequestOptions): Promise<Page<AgledgerEvent>> {
    return this.http.getPage<AgledgerEvent>(
      '/v1/events',
      params as unknown as Record<string, unknown>,
      options,
    );
  }

  /** Auto-paginating iterator. Yields individual events across all pages. */
  listAll(
    params: ListEventsParams,
    options?: RequestOptions & AutoPaginateOptions,
  ): AsyncGenerator<AgledgerEvent> {
    return this.http.paginate<AgledgerEvent>(
      '/v1/events',
      params as unknown as Record<string, unknown>,
      options,
    );
  }
}
