import { HttpResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { ApiCacheService } from './api-cache.service';

describe('ApiCacheService', () => {
  let service: ApiCacheService;

  beforeEach(() => {
    service = new ApiCacheService();
  });

  it('shares a single in-flight request for the same cache key', () => {
    const response = new HttpResponse({ status: 200, body: [{ id: 1 }] });
    const pending = new Subject<HttpResponse<unknown>>();
    const load = vi.fn(() => pending.asObservable());
    const key = 'company:1|user:2|inventory:3|/api/Articles';
    let first: unknown;
    let second: unknown;

    service.coalesce(key, 60_000, load).subscribe(value => first = value);
    service.coalesce(key, 60_000, load).subscribe(value => second = value);

    expect(load).toHaveBeenCalledTimes(1);
    pending.next(response);
    pending.complete();

    expect(first).toBe(response);
    expect(second).toBe(response);
    expect(service.get(key)?.body).toEqual([{ id: 1 }]);
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
