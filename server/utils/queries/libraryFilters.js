const Sequelize = require('sequelize')
const Database = require('../../Database')
const Logger = require('../../Logger')
const libraryItemsBookFilters = require('./libraryItemsBookFilters')
const libraryItemsPodcastFilters = require('./libraryItemsPodcastFilters')

module.exports = {
  decode(text) {
    return Buffer.from(decodeURIComponent(text), 'base64').toString()
  },

  /**
   * Get library items using filter and sort
   * @param {oldLibrary} library 
   * @param {oldUser} user 
   * @param {object} options 
   * @returns {object} { libraryItems:LibraryItem[], count:number }
   */
  async getFilteredLibraryItems(library, user, options) {
    const { filterBy, sortBy, sortDesc, limit, offset, collapseseries, include, mediaType } = options

    let filterValue = null
    let filterGroup = null
    if (filterBy) {
      const searchGroups = ['genres', 'tags', 'series', 'authors', 'progress', 'narrators', 'publishers', 'missing', 'languages', 'tracks', 'ebooks']
      const group = searchGroups.find(_group => filterBy.startsWith(_group + '.'))
      filterGroup = group || filterBy
      filterValue = group ? this.decode(filterBy.replace(`${group}.`, '')) : null
    }

    if (mediaType === 'book') {
      return libraryItemsBookFilters.getFilteredLibraryItems(library.id, user, filterGroup, filterValue, sortBy, sortDesc, collapseseries, include, limit, offset)
    } else {
      return libraryItemsPodcastFilters.getFilteredLibraryItems(library.id, user, filterGroup, filterValue, sortBy, sortDesc, include, limit, offset)
    }
  },

  /**
   * Get library items for continue listening & continue reading shelves
   * @param {oldLibrary} library 
   * @param {oldUser} user 
   * @param {string[]} include 
   * @param {number} limit 
   * @returns {object} { items:LibraryItem[], count:number }
   */
  async getMediaItemsInProgress(library, user, include, limit) {
    if (library.mediaType === 'book') {
      const { libraryItems, count } = await libraryItemsBookFilters.getFilteredLibraryItems(library.id, user, 'progress', 'in-progress', 'progress', true, false, include, limit, 0)
      return {
        items: libraryItems.map(li => {
          const oldLibraryItem = Database.models.libraryItem.getOldLibraryItem(li).toJSONMinified()
          if (li.rssFeed) {
            oldLibraryItem.rssFeed = Database.models.feed.getOldFeed(li.rssFeed).toJSONMinified()
          }
          return oldLibraryItem
        }),
        count
      }
    } else {
      const { libraryItems, count } = await libraryItemsPodcastFilters.getFilteredPodcastEpisodes(library.id, user, 'progress', 'in-progress', 'progress', true, limit, 0)
      return {
        count,
        items: libraryItems.map(li => {
          const oldLibraryItem = Database.models.libraryItem.getOldLibraryItem(li).toJSONMinified()
          oldLibraryItem.recentEpisode = li.recentEpisode
          return oldLibraryItem
        })
      }
    }
  },

  /**
   * Get library items for most recently added shelf
   * @param {oldLibrary} library 
   * @param {oldUser} user 
   * @param {string[]} include 
   * @param {number} limit 
   * @returns {object} { libraryItems:LibraryItem[], count:number }
   */
  async getLibraryItemsMostRecentlyAdded(library, user, include, limit) {
    if (library.mediaType === 'book') {
      const { libraryItems, count } = await libraryItemsBookFilters.getFilteredLibraryItems(library.id, user, 'recent', null, 'addedAt', true, false, include, limit, 0)
      return {
        libraryItems: libraryItems.map(li => {
          const oldLibraryItem = Database.models.libraryItem.getOldLibraryItem(li).toJSONMinified()
          if (li.rssFeed) {
            oldLibraryItem.rssFeed = Database.models.feed.getOldFeed(li.rssFeed).toJSONMinified()
          }
          if (li.size && !oldLibraryItem.media.size) {
            oldLibraryItem.media.size = li.size
          }
          return oldLibraryItem
        }),
        count
      }
    } else {
      const { libraryItems, count } = await libraryItemsPodcastFilters.getFilteredLibraryItems(library.id, user, 'recent', null, 'addedAt', true, include, limit, 0)
      return {
        libraryItems: libraryItems.map(li => {
          const oldLibraryItem = Database.models.libraryItem.getOldLibraryItem(li).toJSONMinified()
          if (li.rssFeed) {
            oldLibraryItem.rssFeed = Database.models.feed.getOldFeed(li.rssFeed).toJSONMinified()
          }
          if (li.size && !oldLibraryItem.media.size) {
            oldLibraryItem.media.size = li.size
          }
          return oldLibraryItem
        }),
        count
      }
    }
  },

  /**
   * Get library items for continue series shelf
   * @param {string} library 
   * @param {oldUser} user 
   * @param {string[]} include 
   * @param {number} limit 
   * @returns {object} { libraryItems:LibraryItem[], count:number }
   */
  async getLibraryItemsContinueSeries(library, user, include, limit) {
    const { libraryItems, count } = await libraryItemsBookFilters.getContinueSeriesLibraryItems(library.id, user, include, limit, 0)
    return {
      libraryItems: libraryItems.map(li => {
        const oldLibraryItem = Database.models.libraryItem.getOldLibraryItem(li).toJSONMinified()
        if (li.rssFeed) {
          oldLibraryItem.rssFeed = Database.models.feed.getOldFeed(li.rssFeed).toJSONMinified()
        }
        if (li.series) {
          oldLibraryItem.media.metadata.series = li.series
        }
        return oldLibraryItem
      }),
      count
    }
  },

  /**
   * Get library items or podcast episodes for the "Listen Again" and "Read Again" shelf
   * @param {oldLibrary} library 
   * @param {oldUser} user 
   * @param {string[]} include 
   * @param {number} limit 
   * @returns {object} { items:object[], count:number }
   */
  async getMediaFinished(library, user, include, limit) {
    if (library.mediaType === 'book') {
      const { libraryItems, count } = await libraryItemsBookFilters.getFilteredLibraryItems(library.id, user, 'progress', 'finished', 'progress', true, false, include, limit, 0)
      return {
        items: libraryItems.map(li => {
          const oldLibraryItem = Database.models.libraryItem.getOldLibraryItem(li).toJSONMinified()
          if (li.rssFeed) {
            oldLibraryItem.rssFeed = Database.models.feed.getOldFeed(li.rssFeed).toJSONMinified()
          }
          return oldLibraryItem
        }),
        count
      }
    } else {
      const { libraryItems, count } = await libraryItemsPodcastFilters.getFilteredPodcastEpisodes(library.id, user, 'progress', 'finished', 'progress', true, limit, 0)
      return {
        count,
        items: libraryItems.map(li => {
          const oldLibraryItem = Database.models.libraryItem.getOldLibraryItem(li).toJSONMinified()
          oldLibraryItem.recentEpisode = li.recentEpisode
          return oldLibraryItem
        })
      }
    }
  },

  /**
   * Get series for recent series shelf
   * @param {oldLibrary} library 
   * @param {oldUser} user
   * @param {string[]} include 
   * @param {number} limit 
   * @returns {object} { series:oldSeries[], count:number}
   */
  async getSeriesMostRecentlyAdded(library, user, include, limit) {
    if (library.mediaType !== 'book') return { series: [], count: 0 }

    const seriesIncludes = []
    if (include.includes('rssfeed')) {
      seriesIncludes.push({
        model: Database.models.feed
      })
    }

    const userPermissionBookWhere = libraryItemsBookFilters.getUserPermissionBookWhereQuery(user)

    const seriesWhere = [
      {
        libraryId: library.id,
        createdAt: {
          [Sequelize.Op.gte]: new Date(new Date() - (60 * 24 * 60 * 60 * 1000)) // 60 days ago
        }
      }
    ]
    // Handle user permissions to only include series with at least 1 book
    // TODO: Simplify to a single query
    if (userPermissionBookWhere.bookWhere.length) {
      let attrQuery = 'SELECT count(*) FROM books b, bookSeries bs WHERE bs.seriesId = series.id AND bs.bookId = b.id'
      if (!user.canAccessExplicitContent) {
        attrQuery += ' AND b.explicit = 0'
      }
      if (!user.permissions.accessAllTags && user.itemTagsSelected.length) {
        if (user.permissions.selectedTagsNotAccessible) {
          attrQuery += ' AND (SELECT count(*) FROM json_each(tags) WHERE json_valid(tags) AND json_each.value IN (:userTagsSelected)) = 0'
        } else {
          attrQuery += ' AND (SELECT count(*) FROM json_each(tags) WHERE json_valid(tags) AND json_each.value IN (:userTagsSelected)) > 0'
        }
      }
      seriesWhere.push(Sequelize.where(Sequelize.literal(`(${attrQuery})`), {
        [Sequelize.Op.gt]: 0
      }))
    }

    const { rows: series, count } = await Database.models.series.findAndCountAll({
      where: seriesWhere,
      limit,
      offset: 0,
      distinct: true,
      subQuery: false,
      replacements: userPermissionBookWhere.replacements,
      include: [
        {
          model: Database.models.bookSeries,
          include: {
            model: Database.models.book,
            where: userPermissionBookWhere.bookWhere,
            include: {
              model: Database.models.libraryItem
            }
          },
          separate: true
        },
        ...seriesIncludes
      ],
      order: [
        ['createdAt', 'DESC']
      ]
    })

    const allOldSeries = []
    for (const s of series) {
      const oldSeries = s.getOldSeries().toJSON()

      if (s.feeds?.length) {
        oldSeries.rssFeed = Database.models.feed.getOldFeed(s.feeds[0]).toJSONMinified()
      }

      // TODO: Sort books by sequence in query
      s.bookSeries.sort((a, b) => {
        if (!a.sequence) return 1
        if (!b.sequence) return -1
        return a.sequence.localeCompare(b.sequence, undefined, {
          numeric: true,
          sensitivity: 'base'
        })
      })
      oldSeries.books = s.bookSeries.map(bs => {
        const libraryItem = bs.book.libraryItem.toJSON()
        delete bs.book.libraryItem
        libraryItem.media = bs.book
        const oldLibraryItem = Database.models.libraryItem.getOldLibraryItem(libraryItem).toJSONMinified()
        return oldLibraryItem
      })
      allOldSeries.push(oldSeries)
    }

    return {
      series: allOldSeries,
      count
    }
  },

  /**
   * Get most recently created authors for "Newest Authors" shelf
   * Author must be linked to at least 1 book
   * @param {oldLibrary} library 
   * @param {oldUser} user
   * @param {number} limit 
   * @returns {object} { authors:oldAuthor[], count:number }
   */
  async getNewestAuthors(library, user, limit) {
    if (library.mediaType !== 'book') return { authors: [], count: 0 }

    const { rows: authors, count } = await Database.models.author.findAndCountAll({
      where: {
        libraryId: library.id,
        createdAt: {
          [Sequelize.Op.gte]: new Date(new Date() - (60 * 24 * 60 * 60 * 1000)) // 60 days ago
        }
      },
      include: {
        model: Database.models.bookAuthor,
        required: true // Must belong to a book
      },
      limit,
      distinct: true,
      order: [
        ['createdAt', 'DESC']
      ]
    })

    return {
      authors: authors.map((au) => {
        const numBooks = au.bookAuthors?.length || 0
        return au.getOldAuthor().toJSONExpanded(numBooks)
      }),
      count
    }
  },

  /**
   * Get book library items for the "Discover" shelf
   * @param {oldLibrary} library 
   * @param {oldUser} user 
   * @param {string[]} include 
   * @param {number} limit 
   * @returns {object} {libraryItems:oldLibraryItem[], count:number}
   */
  async getLibraryItemsToDiscover(library, user, include, limit) {
    if (library.mediaType !== 'book') return { libraryItems: [], count: 0 }

    const { libraryItems, count } = await libraryItemsBookFilters.getDiscoverLibraryItems(library.id, user, include, limit)
    return {
      libraryItems: libraryItems.map(li => {
        const oldLibraryItem = Database.models.libraryItem.getOldLibraryItem(li).toJSONMinified()
        if (li.rssFeed) {
          oldLibraryItem.rssFeed = Database.models.feed.getOldFeed(li.rssFeed).toJSONMinified()
        }
        return oldLibraryItem
      }),
      count
    }
  },

  /**
   * Get podcast episodes most recently added
   * @param {oldLibrary} library 
   * @param {oldUser} user 
   * @param {number} limit 
   * @returns {object} {libraryItems:oldLibraryItem[], count:number}
   */
  async getNewestPodcastEpisodes(library, user, limit) {
    if (library.mediaType !== 'podcast') return { libraryItems: [], count: 0 }

    const { libraryItems, count } = await libraryItemsPodcastFilters.getFilteredPodcastEpisodes(library.id, user, 'recent', null, 'createdAt', true, limit, 0)
    return {
      count,
      libraryItems: libraryItems.map(li => {
        const oldLibraryItem = Database.models.libraryItem.getOldLibraryItem(li).toJSONMinified()
        oldLibraryItem.recentEpisode = li.recentEpisode
        return oldLibraryItem
      })
    }
  },

  /**
   * Get library items for an author, optional use user permissions
   * @param {oldAuthor} author 
   * @param {[oldUser]} user 
   * @param {number} limit 
   * @param {number} offset 
   * @returns {Promise<object>} { libraryItems:LibraryItem[], count:number }
   */
  async getLibraryItemsForAuthor(author, user, limit, offset) {
    const { libraryItems, count } = await libraryItemsBookFilters.getFilteredLibraryItems(author.libraryId, user, 'authors', author.id, 'addedAt', true, false, [], limit, offset)
    return {
      count,
      libraryItems
    }
  },

  /**
   * Get book library items in a collection
   * @param {oldCollection} collection 
   * @returns {Promise<LibraryItem[]>}
   */
  getLibraryItemsForCollection(collection) {
    return libraryItemsBookFilters.getLibraryItemsForCollection(collection)
  }
}