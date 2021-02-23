#!/usr/bin/env python
# -*- coding: utf-8 -*- #

AUTHOR = 'Thamme Gowda'
SITENAME = "Thamme Gowda"
SITEURL = 'https://isi.edu/~tg'
#SITEURL = '/'

PATH = 'content'
THEME_TEMPLATES_OVERRIDES = ['templates/']  # overridden and new templates goes here
DIRECT_TEMPLATES = ['index', 'archives', 'publications',]  # 'categories', 'tags', 'authors',
TIMEZONE = 'America/Los_Angeles'
#PAGINATED_TEMPLATES = {'index': 15}
INDEX_SAVE_AS = 'posts/index.html'

DEFAULT_LANG = 'en'
LOCALE = 'en_US'

# Feed generation is usually not desired when developing
FEED_ALL_ATOM = None
CATEGORY_FEED_ATOM = None
TRANSLATION_FEED_ATOM = None
AUTHOR_FEED_ATOM = None
AUTHOR_FEED_RSS = None

DEFAULT_DATE_FORMAT = '%d %B %Y'
# Whether to display pages on the menu of the template. Templates may or may not honor this setting.
DISPLAY_PAGES_ON_MENU = False
# Whether to display categories on the menu of the template.
DISPLAY_CATEGORIES_ON_MENU = False
# When you don’t specify a category in your post metadata, set this setting to True, and organize your articles in subfolders, the subfolder will become the category of your post. If set to False, DEFAULT_CATEGORY will be used as a fallback.
USE_FOLDER_AS_CATEGORY = True

STATIC_PATHS = ['images', 'css', 'js', 'projs/csci644hw3', 'fevicon.ico', 'files']
ARTICLE_EXCLUDES = ['projs/csci644hw3']

MENUITEMS = (
    ('Notes', '/notes'),
    ('Publications', '/publications'),
    ('Softwares', '/softwares'),
    ('Blog', '/posts'),
    ('Home', '/'),
)

# Blogroll
LINKS = (('USC', 'https://usc.edu/'),
         ('USC ISI', 'https://isi.edu/'),
         ('USC Viterbi School', 'https://viterbischool.usc.edu/'),
         ('USC CS Dept', 'https://cs.usc.edu/'),
         ('USC ISI NLP Group', 'https://www.isi.edu/research_groups/nlg/home')
         )
# LINKS = (('Pelican', 'https://getpelican.com/'),
#         ('Python.org', 'https://www.python.org/'),
#         ('Jinja2', 'https://palletsprojects.com/p/jinja/'),
#         ('You can modify those links in your config file', '#'),)

# Social widget
SOCIAL = (
    ('tg@isi.edu', 'mailto:'),
    ('Twitter', 'https://twitter.com/thammegowda'),
    ('Github', 'https://github.com/thammegowda'),
    ('LinkedIn', 'https://www.linkedin.com/in/thammegowda/'),
    ('Stack Overflow', 'https://stackexchange.com/users/1632148/thamme-gowda?tab=accounts'),
    ('Quora', 'https://www.quora.com/profile/Thamme-Gowda'),
    ('Instagram', 'https://instagram.com/thammegowda/'),
    ('GoodReads', 'https://www.goodreads.com/user/show/31845074-thamme-gowda'),
    ('WordPress', 'https://thammegowda.wordpress.com'),
)

DEFAULT_PAGINATION = 15

# Uncomment following line if you want document-relative URLs when developing
RELATIVE_URLS = False

PLUGIN_PATHS = ['pelican-plugins']
# PLUGINS = ['assets', 'sitemap', 'gravatar']
PLUGINS = ['asciidoc_reader', 'assets', 'pelican.plugins.webassets', 'gravatar', 'pelican-bibtex']

import bulrush

THEME = bulrush.PATH

JINJA_ENVIRONMENT = bulrush.ENVIRONMENT
JINJA_FILTERS = bulrush.FILTERS

GOOGLE_ANALYTICS = 'UA-109985365-1'
TWITTER_USERNAME = 'thammegowda'

EXTRA_PATH_METADATA = {
    'css/adocdefault.css': {'path': 'css/custom.css'},
}

# URLS
ARTICLE_URL = 'posts/{date:%Y}/{date:%m}/{slug}/'
ARTICLE_SAVE_AS = 'posts/{date:%Y}/{date:%m}/{slug}/index.html'
PAGE_URL = '{slug}/'
PAGE_SAVE_AS = '{slug}/index.html'
YEAR_ARCHIVE_SAVE_AS = 'posts/{date:%Y}/index.html'
MONTH_ARCHIVE_SAVE_AS = 'posts/{date:%Y}/{date:%m}/index.html'

PUBLICATIONS_SRC = 'content/files/pubs.bib'
