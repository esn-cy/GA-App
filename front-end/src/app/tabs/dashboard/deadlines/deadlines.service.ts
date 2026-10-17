import { Injectable } from '@angular/core';
import { IDEAApiService } from '@idea-ionic/common';

import { Deadline } from '@models/deadline.model';

@Injectable({ providedIn: 'root' })
export class DeadlinesService {
  private deadlines: Deadline[] | undefined;
  private filterByYear?: number;

  /**
   * The number of deadlines to consider for the pagination, when active.
   */
  MAX_PAGE_SIZE = 24;

  constructor(private api: IDEAApiService) {}

  /**
   * Load the deadlines from the back-end, possibly filtering by year.
   * If no year is specified, only the future deadlines are returned.
   */
  private async loadListOfYear(year?: number): Promise<void> {
    const params: any = {};
    if (year) params.year = year;
    this.filterByYear = year;
    const deadlines: Deadline[] = await this.api.getResource('deadlines', { params });
    this.deadlines = deadlines.map(x => new Deadline(x));
  }

  /**
   * Get (and optionally filter) the list of deadlines.
   * Note: it's a slice of the array.
   */
  async getList(
    options: {
      force?: boolean;
      search?: string;
      year?: number;
      withPagination?: boolean;
      startPaginationAfterId?: string;
    } = {}
  ): Promise<Deadline[] | undefined> {
    if (!this.deadlines || options.force || options.year !== this.filterByYear) await this.loadListOfYear(options.year);
    if (!this.deadlines) return undefined;

    const search = options.search ? String(options.search).toLowerCase() : '';

    let filteredList = this.deadlines.slice();

    if (search)
      filteredList = filteredList.filter(x =>
        search
          .split(' ')
          .every(searchTerm => [x.name].filter(f => f).some(f => f.toLowerCase().includes(searchTerm)))
      );

    filteredList = filteredList.sort((a, b): number => a.at.localeCompare(b.at));

    if (options.withPagination && filteredList.length > this.MAX_PAGE_SIZE) {
      let indexOfLastOfPreviousPage = 0;
      if (options.startPaginationAfterId)
        indexOfLastOfPreviousPage = filteredList.findIndex(x => x.deadlineId === options.startPaginationAfterId) || 0;
      filteredList = filteredList.slice(0, indexOfLastOfPreviousPage + this.MAX_PAGE_SIZE);
    }

    return filteredList;
  }

  /**
   * Get a deadline by its id.
   */
  async getById(deadlineId: string): Promise<Deadline> {
    return new Deadline(await this.api.getResource(['deadlines', deadlineId]));
  }

  /**
   * Insert a deadline.
   */
  async insert(deadline: Deadline): Promise<Deadline> {
    return new Deadline(await this.api.postResource('deadlines', { body: deadline }));
  }

  /**
   * Update a deadline.
   */
  async update(deadline: Deadline): Promise<Deadline> {
    return new Deadline(await this.api.putResource(['deadlines', deadline.deadlineId], { body: deadline }));
  }

  /**
   * Delete a deadline.
   */
  async delete(deadline: Deadline): Promise<void> {
    await this.api.deleteResource(['deadlines', deadline.deadlineId]);
  }
}
