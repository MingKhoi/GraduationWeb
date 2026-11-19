import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard.js';
import { UpdateWorldSettingsDto } from './dto/update-world-settings.dto.js';
import { WorldSettingsService } from './world-settings.service.js';

@Controller('world-settings')
export class WorldSettingsController {
  constructor(private readonly settingsService: WorldSettingsService) {}

  @Get()
  getPublic() {
    return this.settingsService.getPublic();
  }

  @Get('admin')
  @UseGuards(AdminAuthGuard)
  getAdmin() {
    return this.settingsService.getAdmin();
  }

  @Put('admin')
  @UseGuards(AdminAuthGuard)
  update(@Body() dto: UpdateWorldSettingsDto) {
    return this.settingsService.update(dto);
  }
}
