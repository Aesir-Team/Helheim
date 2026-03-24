import { countPublishedChapterNumbersUpToBookmark } from './chapter-read-progress-count.policy';

describe('countPublishedChapterNumbersUpToBookmark', () => {
  it('Given bookmark "3", should count 1..3 in natural order', () => {
    const nums = ['1', '2', '3', '10', '20'];
    expect(countPublishedChapterNumbersUpToBookmark(nums, '3')).toBe(3);
  });

  it('Given bookmark "10", should include numeric 10 after single digits', () => {
    const nums = ['1', '2', '10', '11'];
    expect(countPublishedChapterNumbersUpToBookmark(nums, '10')).toBe(3);
  });
});
