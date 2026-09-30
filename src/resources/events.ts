import type { HttpClient } from '../http.js';
import type {
  AgledgerEvent,
  EventPage,
  ListEventsParams,
  RequestOptions,
  AutoPaginateOptions,
} from '../types.js';

export class EventsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List events globally. `since` is required and inclusive; pair it with
   * `until` to close the window so consecutive polls compose without overlap.
   * The page's `visibleBefore` is the exclusive upper bound the walk serves:
   * send it as the next window's `since` so consecutive windows neither overlap
   * nor skip an event that committed late.
   * GET /v1/events?since=...&until=...&order=asc|desc
   */
  async list(params: ListEventsParams, options?: RequestOptions): Promise<EventPage> {
    const { page, envelope } = await this.http.getPageWithEnvelope<AgledgerEvent>(
      '/v1/events',
      params as unknown as Record<string, unknown>,
      options,
    );
    return typeof envelope.visibleBefore === 'string' ? { ...page, visibleBefore: envelope.visibleBefore } : page;
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
