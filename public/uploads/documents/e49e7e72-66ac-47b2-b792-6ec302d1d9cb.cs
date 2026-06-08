using Abp.Application.Services.Dto;
using Abp.Collections.Extensions;
using Abp.Domain.Repositories;
using Abp.Extensions;
using Abp.Linq.Extensions;
using Abp.UI;
using ERP.Authorization.Users;
using ERP.Business.LeaveApplication.Dto;
using ERP.Models;
using ERP.Models.Business;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ERP.Business.LeaveApplication
{
    public class LeaveApplicationLogAppService : ERPAppServiceBase, ILeaveApplicationLogAppService
    {
        private readonly IRepository<Models.Business.LeaveApplicationLog, long> _leaveApplicationLogRepository;
        private readonly IRepository<User, long> _userRepository;

        public LeaveApplicationLogAppService(IRepository<LeaveApplicationLog, long> leaveApplicationLogRepository, IRepository<User, long> userRepository)
        {
            _leaveApplicationLogRepository = leaveApplicationLogRepository;
            _userRepository = userRepository;

        }

        public async Task<long> Create(LeaveApplicationLogDto input)
        {
            var item = ObjectMapper.Map<LeaveApplicationLog>(input);
            item.TenantId = AbpSession.TenantId;

            await _leaveApplicationLogRepository.InsertAsync(item);
            await CurrentUnitOfWork.SaveChangesAsync();
            return item.Id;
        }

        public async Task<bool> Delete(long id)
        {
            try
            {
                await _leaveApplicationLogRepository.DeleteAsync(id);
                return true;
            }
            catch (Exception ex)
            {
                throw new UserFriendlyException(ex.Message);

            }
        }

        public async Task<List<LeaveApplicationLogDto>> GetByLeaveApplicationId(long id)
        {
            try
            {
                List<LeaveApplicationLogDto> lstResult = new List<LeaveApplicationLogDto>();
                var lstLeaveAppLogs = await _leaveApplicationLogRepository.GetAll().Where(x => x.LeaveApplicationId == id).ToListAsync();

                var query = lstLeaveAppLogs.Select(c => new LeaveApplicationLogDto
                {
                    Id = c.Id,
                    LeaveApplicationId = c.LeaveApplicationId,
                    ApproverName = _userRepository.GetAll().Where(y => y.Id == c.ApproverId).Select(x => x.Surname).FirstOrDefault(),
                    ApprovedDate = c.ApprovedDate,
                    Status = c.Status,
                    Note = c.Note,
                }).ToList();

                //return ObjectMapper.Map<LeaveApplicationLogDto>(query);
                lstResult = ObjectMapper.Map<List<LeaveApplicationLogDto>>(query);
                return lstResult;
            } 
            catch (Exception ex)
            {
                throw new UserFriendlyException(ex.Message);
            }
        }

        public async Task<PagedResultDto<LeaveApplicationLogDto>> GetAll(FilterLeaveApplicationLogDto input)
        {


            var user = await this.GetCurrentUserAsync();
            var userId = user.Id; // this.AbpSession.UserId;
            var departmentId = user.DepartmentId.HasValue ? user.DepartmentId : 0;
            DateTime now = DateTime.Now;

            var queryable = _leaveApplicationLogRepository.GetAll();

            var query = queryable.Select(c => new LeaveApplicationLogDto
            {
                Id = c.Id,
                LeaveApplicationId = c.LeaveApplicationId,
                ApproverName = _userRepository.GetAll().Where(y => y.Id == c.ApproverId).Select(x => x.Surname).FirstOrDefault(),
                ApprovedDate = c.ApprovedDate,
                Status = c.Status,
                Note = c.Note,
            }).WhereIf(!input.Filter.IsNullOrEmpty(), x => x.LeaveApplicationId == input.LeaveApplicationId).ToList();

            var totalCount = query.AsQueryable().Count();
            var pagedDepartment = query.AsQueryable().OrderByDescending(x => x.Id).ThenByDescending(x => x.Status).PageBy(input).ToList();

            var result = ObjectMapper.Map<List<LeaveApplicationLogDto>>(pagedDepartment);

            return new PagedResultDto<LeaveApplicationLogDto>(totalCount, result);
        }

        public async Task<LeaveApplicationLogDto> GetId(long id)
        {
            var entity = await _leaveApplicationLogRepository.FirstOrDefaultAsync(id);
            var dto = ObjectMapper.Map<LeaveApplicationLogDto>(entity);

            return dto;
        }

        public async Task Update(LeaveApplicationLogDto input)
        {
            var leaveAppLog = await _leaveApplicationLogRepository.FirstOrDefaultAsync(input.Id);
            ObjectMapper.Map(input, leaveAppLog);
        }
    }
}
