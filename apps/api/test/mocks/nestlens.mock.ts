import { Global, Module, DynamicModule } from '@nestjs/common';

@Global()
@Module({})
export class NestLensModule {
  static forRoot(_options?: any): DynamicModule {
    return {
      module: NestLensModule,
      providers: [],
      exports: [],
    };
  }
}
