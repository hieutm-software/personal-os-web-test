using Abp.Domain.Repositories;
using Abp.UI;
using ERP.Business.LeaveApplication.Dto;
using ERP.Models.Business;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ERP.Business.LeaveApplication
{
    public class EmployeeAnnualLeaveAppService : ERPAppServiceBase, IEmployeeAnnualLeaveAppService
    {
        private readonly IRepository<Models.Business.EmployeeAnnualLeave, long> _employeeAnnualLeaveRepository;
        private readonly IRepository<Models.Business.LeaveApplication, long> _leaveApplicationRepository;

        public EmployeeAnnualLeaveAppService(IRepository<EmployeeAnnualLeave, long> employeeAnnualLeaveRepository, 
            IRepository<Models.Business.LeaveApplication, long> leaveApplicationRepository)
        {
            _employeeAnnualLeaveRepository = employeeAnnualLeaveRepository;
            _leaveApplicationRepository = leaveApplicationRepository;
        }

        public Task<EmployeeAnnualLeaveDto> GetByCode(string code)
        {
            throw new NotImplementedException();
        }

        public async Task<EmployeeAnnualLeaveDto> GetByeEmployeeId(long id)
        {
            try
            {
                var user = await this.GetCurrentUserAsync();
                var userEmail = user.EmailAddress;
                var employeeInfo = await _employeeAnnualLeaveRepository.GetAll().Where(x => x.EmployeeId == id)
                    .Select(c => new EmployeeAnnualLeave
                    {
                        Id = c.Id,
                        EmployeeId = c.EmployeeId,
                        AnnualLeaveLastYear = c.AnnualLeaveLastYear,
                        DaysLeft = c.DaysLeft,
                        DaysUsed = c.DaysUsed,
                        NumberOfAnnualLeave = c.NumberOfAnnualLeave,
                        AnnualLeaveThisYearUsed = c.AnnualLeaveThisYearUsed,
                    }).FirstOrDefaultAsync();

                if (employeeInfo != null || userEmail == "admin@defaulttenant.com" || userEmail == "admin@aits.vn")
                {
                    return ObjectMapper.Map<EmployeeAnnualLeaveDto>(employeeInfo);
                }
                else
                {
                    throw new UserFriendlyException(L("Không có thông tin phép của nhân viên đăng ký nghỉ"), id.ToString());
                }
            }
            catch (Exception ex)
            {
                throw new UserFriendlyException(ex.Message, ex);
            }
        }

        public async Task<EmployeeAnnualLeaveDto> GetAnuualByEmployeeId(long currentUserId, long id)
        {
            try
            {
                var user = await this.GetCurrentUserAsync();
                var userEmail = user.EmailAddress;
                DateTime currentTime = DateTime.Now;
                var userId = currentUserId;
                EmployeeAnnualLeave employeeAnnualLeave = await _employeeAnnualLeaveRepository.GetAll().Where(x => x.EmployeeId == id).FirstOrDefaultAsync();
                
                decimal DaysLeft = 0;
                decimal DaysUsed = 0;
                decimal AnnualLeaveThisYearUsed = 0;

                if (employeeAnnualLeave != null)
                {
                    decimal PhepNamTruoc = employeeAnnualLeave.AnnualLeaveLastYear != null ? employeeAnnualLeave.AnnualLeaveLastYear : 0;
                    decimal SoPhepNamNay = employeeAnnualLeave.NumberOfAnnualLeave != null ? employeeAnnualLeave.NumberOfAnnualLeave : 0;

                    var ListLeaveApplication = await _leaveApplicationRepository.GetAll().Where(x =>
                        x.SubscriberId == userId && x.IsDeleted == false && x.Status != -1 && x.LeaveApplicationType_.Code.Contains("P") &&
                        (x.FromDate.Value.Year == currentTime.Year || x.ToDate.Value.Year == currentTime.Year))
                            .ToListAsync();

                    if (ListLeaveApplication.Count > 0)
                    {

                        decimal NgayNghiQuy1 = 0;
                        decimal NgayNghiSauQuy1 = 0;

                        foreach (var Leave in ListLeaveApplication)
                        {
                            if (Leave.FromDate.Value.Month <= 3 || Leave.ToDate.Value.Month <= 3)
                            {
                                NgayNghiQuy1 += Leave.NumberOfDayOff.Value;
                            }
                            else
                            {
                                NgayNghiSauQuy1 += Leave.NumberOfDayOff.Value;
                            }

                        }
                        var SumAnnual = (NgayNghiQuy1 - PhepNamTruoc > 0 ? NgayNghiQuy1 - PhepNamTruoc : 0) + NgayNghiSauQuy1;
                        DaysUsed = NgayNghiQuy1 + NgayNghiSauQuy1;
                        AnnualLeaveThisYearUsed = (NgayNghiQuy1 - PhepNamTruoc > 0 ? NgayNghiQuy1 - PhepNamTruoc : 0) + NgayNghiSauQuy1;

                        if (currentTime.Month <= 3)
                        {
                            DaysLeft = (PhepNamTruoc + SoPhepNamNay) - DaysUsed;
                        }
                        else
                        {
                            DaysLeft = SoPhepNamNay - AnnualLeaveThisYearUsed;
                        }

                        employeeAnnualLeave.AnnualLeaveLastYear = PhepNamTruoc;
                        employeeAnnualLeave.NumberOfAnnualLeave = SoPhepNamNay;
                        employeeAnnualLeave.DaysUsed = DaysUsed;
                        employeeAnnualLeave.AnnualLeaveThisYearUsed = AnnualLeaveThisYearUsed;
                        employeeAnnualLeave.DaysLeft = DaysLeft;
                    }
                    else
                    {
                        employeeAnnualLeave.AnnualLeaveLastYear = employeeAnnualLeave.AnnualLeaveLastYear;
                        employeeAnnualLeave.NumberOfAnnualLeave = employeeAnnualLeave.NumberOfAnnualLeave;
                        employeeAnnualLeave.DaysUsed = 0;
                        employeeAnnualLeave.AnnualLeaveThisYearUsed = 0;
                        if(currentTime.Month <= 3)
                        {
                            employeeAnnualLeave.DaysLeft = employeeAnnualLeave.AnnualLeaveLastYear + employeeAnnualLeave.NumberOfAnnualLeave;
                        } else
                        {
                            employeeAnnualLeave.DaysLeft = employeeAnnualLeave.NumberOfAnnualLeave;
                        }
                        
                    }
                    return ObjectMapper.Map<EmployeeAnnualLeaveDto>(employeeAnnualLeave);
                }
                else if (userEmail == "admin@defaulttenant.com" || userEmail == "admin@aits.vn")
                {
                    return ObjectMapper.Map<EmployeeAnnualLeaveDto>(employeeAnnualLeave);
                }
                else
                {
                    throw new UserFriendlyException(L("Không có thông tin phép của nhân viên đăng ký nghỉ"), id.ToString());
                }

            }
            catch (Exception ex)
            {
                throw new UserFriendlyException(ex.Message, ex);
            }
        }

        public async Task Update(EmployeeAnnualLeaveDto input)
        {
            try
            {
                var entity = await _employeeAnnualLeaveRepository.FirstOrDefaultAsync(input.Id);

                ObjectMapper.Map(input, entity);
            }
            catch (Exception ex)
            {
                throw new UserFriendlyException(ex.Message, input.Id.ToString());
            }
        }

        //public async Task UpdateAnnualThisYearUsed(UpdateAnnualThisYearUsedDto input)
        //{
        //    //try
        //    //{
        //    //    var entity = await _employeeAnnualLeaveRepository.FirstOrDefaultAsync(input.Id);

        //    //    ObjectMapper.Map(input, entity);
        //    //}
        //    //catch (Exception ex)
        //    //{
        //    //    throw new UserFriendlyException(ex.Message, input.Id.ToString());
        //    //}
        //    var col1 = await (from c in _employeeAnnualLeaveRepository.GetAll().FirstOrDefaultAsync() select c).ToListAsync();
        //    foreach (var item in col1)
        //    {
        //        item.SPECIFIC_PROPERTY = "VALUE";
        //    }

        //    try
        //    {
        //        db.SubmitChanges();
        //    }
        //    catch (Exception ex)
        //    {
        //        //Handle ex
        //    }
        //}

    }
}
