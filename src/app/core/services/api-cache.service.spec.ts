import { HttpResponse } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { ApiCacheService } from './api-cache.service';

describe('ApiCacheService', () => {
  let service: ApiCacheService;

  beforeEach(() => {
    service = new ApiCacheService();
  });

  it('shares a single in-flight request for the same cache key', () => {
    const response = new HttpResponse({ status: 200, body: [{ id: 1 }] });
    const load = vi.fn(() => of(response));
    let first: unknown;
    let second: unknown;

    service.coalesce('company:1|user:2|inventory:3|/api/Articles', 60_000, load)
      .subscribe(value => first = value);
    service.coalesce('company:1|user:2|inventory:3|/api/Articles', 60_000, load)
      .subscribe(value => second = value);

    expect(load).toHaveBeenCalledTimes(1);
    expect(first).toBe(response);
    expect(second).toBe(response);
    expect(service.get('company:1|user:2|inventory:3|/api/Articles')?.body).toEqual([{ id: 1 }]);
  });

  it('does not repopulate the cache from a request started before invalidation', () => {
    const pending = new Subject<HttpResponse<unknown>>();
    const key = 'company:1|user:2|inventory:3|/api/Articles';

    service.coalesce(key, 60_000, () => pending).subscribe();
    service.clearAll();
    pending.next(new HttpResponse({ status: 200, body: [{ id: 1 }] }));
    pending.complete();

    expect(service.get(key)).toBeNull();
  });
});
