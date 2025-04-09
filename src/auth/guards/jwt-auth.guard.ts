import { Injectable, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);
  
  handleRequest(err, user, info, context) {
    this.logger.debug(`JWT Guard: Handle request called`);
    
    if (err) {
      this.logger.error(`JWT Guard: Error: ${err.message}`);
      throw err;
    }
    
    if (!user) {
      this.logger.error(`JWT Guard: No user found in token`);
      throw new UnauthorizedException('Invalid token or user not found');
    }
    this.logger.log(`JWT Guard: User authenticated successfully`);
    return user;
  }
}