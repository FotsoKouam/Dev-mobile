import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';

describe('ApiService', () => {
  let service: ApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return base URL from environment', () => {
    expect(service.getBaseUrl()).toBe(environment.apiUrl);
  });

  it('should call getHello on the root path and return text', () => {
    const mockResponse = 'Hello World!';

    service.getHello().subscribe((data) => {
      expect(data).toBe(mockResponse);
    });

    const req = httpTestingController.expectOne(environment.apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });
});
